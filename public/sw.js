const DB_NAME = "altman-alerts";
const STORE = "cfg";
const POLL_MS = 60_000;

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "altman-watch" || !data.token) return;
  event.waitUntil(
    saveConfig(data.token).then(() => poll()),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  event.waitUntil(self.clients.openWindow(target));
});

async function poll() {
  const cfg = await loadConfig();
  if (!cfg || !cfg.token) return;
  let response;
  try {
    response = await fetch("/api/alerts/pull", {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
  } catch {
    return;
  }
  if (!response.ok) return;
  const body = await response.json();
  const seen = new Set(cfg.seen || []);
  for (const note of body.notifications || []) {
    if (!note || !note.id || seen.has(note.id)) continue;
    seen.add(note.id);
    await self.registration.showNotification(note.title || "ALTMAN Group", {
      body: note.body || "",
      lang: "he",
      dir: "rtl",
      data: { url: `/?alert=${encodeURIComponent(note.id)}` },
    });
  }
  cfg.seen = Array.from(seen).slice(-200);
  await putConfig(cfg);
}

setInterval(() => {
  poll();
}, POLL_MS);

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadConfig() {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get("watch");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function putConfig(cfg) {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(cfg, "watch");
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function saveConfig(token) {
  const current = (await loadConfig()) || { token, seen: [] };
  current.token = token;
  if (!current.seen) current.seen = [];
  await putConfig(current);
}
