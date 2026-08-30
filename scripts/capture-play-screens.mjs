import fs from "node:fs";
import path from "node:path";
import puppeteer from "/tmp/play-shots/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";

const OUT = path.resolve("store/play");
const URL = "https://altman-group.vercel.app";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const VIEWPORT = { width: 480, height: 854, deviceScaleFactor: 2.25, isMobile: true, hasTouch: true };

const sessions = {
  manager: {
    role: "manager",
    userId: "u_manager",
    fullName: "אבי אלטמן",
    loginAt: new Date().toISOString(),
  },
  landlord: {
    role: "landlord",
    userId: "u_landlord",
    fullName: "דניאל כהן",
    landlordId: "l_1",
    loginAt: new Date().toISOString(),
  },
  tenant: {
    role: "tenant",
    userId: "u_tenant",
    fullName: "דני שמעוני",
    tenantId: "t_5",
    loginAt: new Date().toISOString(),
  },
};

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--hide-scrollbars", "--disable-gpu", "--no-first-run"],
});

const page = await browser.newPage();
await page.setViewport(VIEWPORT);
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

async function waitReady() {
  await page.waitForSelector("main.app-shell", { timeout: 20000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = [...document.images];
    await Promise.all(
      imgs.map((img) =>
        img.complete ? Promise.resolve() : new Promise((res) => { img.onload = img.onerror = res; }),
      ),
    );
  });
  await new Promise((r) => setTimeout(r, 600));
}

async function shot(name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, type: "png", captureBeyondViewport: false });
  console.log("wrote", file);
}

await page.goto(`${URL}/`, { waitUntil: "networkidle2", timeout: 45000 });
await waitReady();
await shot("01-login.png");

await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (el) => el.textContent?.trim() === "התחברות",
  );
  btn?.click();
});
await page.waitForSelector("dialog, [role='dialog']", { timeout: 8000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 400));
await shot("02-login-form.png");

async function openRole(session, route, name) {
  await page.goto(`${URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => {
    localStorage.setItem("altman.session", JSON.stringify(s));
  }, session);
  await page.goto(`${URL}${route}`, { waitUntil: "networkidle2", timeout: 45000 });
  await waitReady();
  await shot(name);
}

await openRole(sessions.manager, "/manager", "03-manager.png");
await openRole(sessions.landlord, "/landlord", "04-landlord.png");
await openRole(sessions.tenant, "/tenant", "05-tenant.png");

await browser.close();
console.log("done");
