import type { DataState } from "@/lib/data-state";
import { emptyState, seedState } from "@/lib/data-state";
import { normalizeEmail } from "@/lib/auth";
import { removeDanglingLogins } from "@/lib/delete-users";
import { getSupabase } from "@/lib/supabase/client";
import { hydrateFileFields, stillEmbedded, warmSignedUrls } from "@/lib/supabase/files";
import { COLLECTIONS, type Row } from "@/lib/supabase/mappers";
import { isLoginRole } from "@/types";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type CollectionKey = keyof DataState;

/** Parents first so a login row cannot be saved without its landlord/tenant. */
const PERSIST_WRITE_ORDER: readonly CollectionKey[] = [
  "landlords",
  "properties",
  "tenants",
  "professionals",
  "leases",
  "payments",
  "expenses",
  "tickets",
  "documents",
  "onboardings",
  "protocols",
  "withdrawals",
  "users",
  "notifications",
  "tasks",
  "chatThreads",
  "chatMessages",
  "activityLog",
];

/** If any of these inserts fail, roll back the others so an email is not left occupied. */
const ATOMIC_CREATE_KEYS = new Set<CollectionKey>([
  "landlords",
  "properties",
  "tenants",
  "leases",
  "users",
  "payments",
  "onboardings",
]);

function writeOrderIndex(key: CollectionKey): number {
  const index = PERSIST_WRITE_ORDER.indexOf(key);
  return index === -1 ? PERSIST_WRITE_ORDER.length : index;
}

function loginEmailOf(item: unknown): string {
  const email = (item as { email?: string } | null)?.email;
  return email ? normalizeEmail(email) : "";
}

async function purgeUnusedAuthEmails(emails: string[]): Promise<void> {
  const unique = [...new Set(emails.filter(Boolean))];
  if (unique.length === 0) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return;
  for (const email of unique) {
    try {
      const response = await fetch("/api/auth/account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "purge-auth", email }),
      });
      if (!response.ok) {
        console.warn(`[supabase] purge-auth failed: ${response.status}`);
      }
    } catch (err) {
      console.warn("[supabase] purge-auth", err);
    }
  }
}

function isMissingRelation(message: string): boolean {
  return /Could not find the table/i.test(message) || /relation .+ does not exist/i.test(message);
}

function parseMissingColumn(message: string): string | null {
  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column [\w.]+\.([a-z0-9_]+) does not exist/i,
    /column "([a-z0-9_]+)" does not exist/i,
  ];
  for (const re of patterns) {
    const match = message.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

function isUniqueViolation(error: PostgrestError): boolean {
  return error.code === "23505" || /duplicate key/i.test(error.message);
}

function cloneState(state: DataState): DataState {
  const next = emptyState();
  for (const col of COLLECTIONS) {
    (next[col.key] as unknown[]) = [...((state[col.key] as unknown[]) ?? [])];
  }
  return next;
}

function replaceById(
  list: unknown[],
  getId: (item: unknown) => string,
  id: string,
  item: unknown,
): unknown[] {
  const idx = list.findIndex((row) => getId(row) === id);
  if (idx === -1) return [item, ...list];
  const copy = list.slice();
  copy[idx] = item;
  return copy;
}

/**
 * Insert or update a row. Prefer insert for new ids — PostgREST upsert uses
 * ON CONFLICT DO UPDATE, which also requires the UPDATE RLS policy to pass.
 * Tenants can insert activity_log / manager notifications but cannot update them.
 */
async function writeRow(
  supabase: SupabaseClient,
  table: string,
  row: Row,
  mode: "insert" | "update",
  idColumn: string,
  id: string,
): Promise<"created" | "exists" | "updated" | string> {
  let current: Row = { ...row };
  for (let attempt = 0; attempt < 8; attempt++) {
    const result =
      mode === "insert"
        ? await supabase.from(table).insert(current)
        : await supabase.from(table).update(current).eq(idColumn, id).select(idColumn);
    if (!result.error) {
      if (mode === "update" && !result.data?.length) {
        return "אין הרשאה לעדכון";
      }
      return mode === "insert" ? "created" : "updated";
    }
    if (mode === "insert" && isUniqueViolation(result.error)) {
      const existing = await supabase.from(table).select(idColumn).eq(idColumn, id).maybeSingle();
      if (!existing.error && existing.data) return "exists";
      return result.error.message;
    }
    const missing = parseMissingColumn(result.error.message);
    if (!missing || !(missing in current)) return result.error.message;
    console.warn(`[supabase] schema lag — omitting ${table}.${missing}`);
    const stripped = { ...current };
    delete stripped[missing];
    current = stripped;
  }
  return "schema fallback retries exhausted";
}

export async function fetchAll(): Promise<DataState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const next = emptyState();
  const results = await Promise.all(
    COLLECTIONS.map(async (col) => {
      const { data, error } = await supabase.from(col.table).select("*");
      if (error) {
        if (isMissingRelation(error.message)) {
          console.warn(`[supabase] missing table ${col.table} — skipping`);
          return { key: col.key, rows: [] as Row[], col };
        }
        throw error;
      }
      return { key: col.key, rows: (data ?? []) as Row[], col };
    }),
  );

  for (const { key, rows, col } of results) {
    const usable =
      col.table === "app_users"
        ? rows.filter((row) => isLoginRole(String(row.role ?? "")))
        : rows;
    (next[key] as unknown[]) = usable.map((row) => col.fromRow(row));
  }

  const fileUrls: string[] = [];
  for (const user of next.users) if (user.avatarUrl) fileUrls.push(user.avatarUrl);
  for (const doc of next.documents) if (doc.fileDataUrl) fileUrls.push(doc.fileDataUrl);
  for (const ticket of next.tickets) if (ticket.photoDataUrl) fileUrls.push(ticket.photoDataUrl);
  for (const protocol of next.protocols) {
    for (const url of protocol.photoDataUrls ?? []) fileUrls.push(url);
  }
  for (const property of next.properties) {
    for (const url of property.photoUrls ?? []) fileUrls.push(url);
  }
  await warmSignedUrls(fileUrls);

  return next;
}

export async function persistDiff(
  prev: DataState,
  next: DataState,
): Promise<{ errors: string[]; applied: DataState }> {
  const supabase = getSupabase();
  if (!supabase) return { errors: [], applied: next };

  const errors: string[] = [];
  const applied = cloneState(prev);
  const deletedLoginEmails: string[] = [];
  const snapshots = COLLECTIONS.map((col) => {
    const prevList = (prev[col.key] as unknown[] | undefined) ?? [];
    const nextList = (next[col.key] as unknown[] | undefined) ?? [];
    const getId = col.getId as (item: unknown) => string;
    return {
      col,
      getId,
      prevMap: new Map(prevList.map((item) => [getId(item), item])),
      nextMap: new Map(nextList.map((item) => [getId(item), item])),
    };
  });

  // Deletes first so removed people/rows cannot come back if a later write fails.
  for (const { col, getId, prevMap, nextMap } of snapshots) {
    const removedIds = [...prevMap.keys()].filter((id) => id && !nextMap.has(id));
    if (removedIds.length === 0) continue;
    if (col.key === "users") {
      for (const id of removedIds) {
        const email = loginEmailOf(prevMap.get(id));
        if (email) deletedLoginEmails.push(email);
      }
    }

    const { error } = await supabase.from(col.table).delete().in(col.idColumn, removedIds);
    if (!error) {
      (applied[col.key] as unknown[]) = (applied[col.key] as unknown[]).filter(
        (row) => !removedIds.includes(getId(row)),
      );
      continue;
    }
    if (isMissingRelation(error.message)) {
      console.warn(`[supabase] missing table ${col.table} — skipping`);
      const message = `${col.table}: הטבלה חסרה בשרת`;
      errors.push(message);
      continue;
    }
    console.warn(`[supabase] batch delete ${col.table}: ${error.message}`);

    for (const id of removedIds) {
      const { error: rowError } = await supabase.from(col.table).delete().eq(col.idColumn, id);
      if (rowError) {
        const message = `${col.table}/${id}: ${rowError.message}`;
        console.error(`[supabase] delete ${message}`);
        errors.push(message);
        continue;
      }
      (applied[col.key] as unknown[]) = (applied[col.key] as unknown[]).filter(
        (row) => getId(row) !== id,
      );
    }
  }

  const inserted: {
    key: CollectionKey;
    table: string;
    idColumn: string;
    id: string;
    getId: (item: unknown) => string;
  }[] = [];
  const failedAtomic = new Set<CollectionKey>();
  const writeSnapshots = [...snapshots].sort(
    (a, b) => writeOrderIndex(a.col.key) - writeOrderIndex(b.col.key),
  );

  for (const { col, getId, prevMap, nextMap } of writeSnapshots) {
    for (const [id, item] of nextMap) {
      const old = prevMap.get(id);
      if (old && JSON.stringify(old) === JSON.stringify(item)) continue;
      const prepared = await hydrateFileFields(col.key, item as Record<string, unknown>);
      if (stillEmbedded(prepared)) {
        const full = `${col.table}/${id}: העלאת קובץ לשרת נכשלה — המסמך לא נשמר`;
        console.error(`[supabase] write ${full}`);
        errors.push(full);
        if (!old && ATOMIC_CREATE_KEYS.has(col.key)) failedAtomic.add(col.key);
        continue;
      }
      const isNew = !old;
      const message = await writeRow(
        supabase,
        col.table,
        col.toRow(prepared as never),
        old ? "update" : "insert",
        col.idColumn,
        id,
      );
      if (message !== "created" && message !== "exists" && message !== "updated") {
        if (isMissingRelation(message)) {
          const full = `${col.table}/${id}: הטבלה חסרה בשרת — הבקשה לא נשמרה`;
          console.error(`[supabase] write ${full}`);
          errors.push(full);
        } else {
          const full = `${col.table}/${id}: ${message}`;
          console.error(`[supabase] write ${full}`);
          errors.push(full);
        }
        if (isNew && ATOMIC_CREATE_KEYS.has(col.key)) failedAtomic.add(col.key);
        continue;
      }
      if (message === "created") {
        inserted.push({
          key: col.key,
          table: col.table,
          idColumn: col.idColumn,
          id,
          getId,
        });
      }
      (applied[col.key] as unknown[]) = replaceById(
        applied[col.key] as unknown[],
        getId,
        id,
        item,
      );
    }
  }

  if (failedAtomic.size > 0) {
    for (const row of inserted.reverse()) {
      const { error } = await supabase.from(row.table).delete().eq(row.idColumn, row.id);
      if (error) {
        const full = `${row.table}/${row.id}: ${error.message}`;
        console.error(`[supabase] rollback ${full}`);
        errors.push(full);
        continue;
      }
      (applied[row.key] as unknown[]) = (applied[row.key] as unknown[]).filter(
        (item) => row.getId(item) !== row.id,
      );
    }
  }

  const withLogins = removeDanglingLogins(applied);
  const keptUserIds = new Set(withLogins.users.map((user) => user.id));
  const droppedUserIds = applied.users
    .map((user) => user.id)
    .filter((id) => !keptUserIds.has(id));
  for (const id of droppedUserIds) {
    const email = loginEmailOf(applied.users.find((user) => user.id === id));
    if (email) deletedLoginEmails.push(email);
    const { error } = await supabase.from("app_users").delete().eq("id", id);
    if (error) {
      const full = `app_users/${id}: ${error.message}`;
      console.error(`[supabase] purge dangling login ${full}`);
      errors.push(full);
      continue;
    }
  }

  const keptEmails = new Set(
    withLogins.users.map((user) => (user.email ? normalizeEmail(user.email) : "")).filter(Boolean),
  );
  await purgeUnusedAuthEmails(deletedLoginEmails.filter((email) => !keptEmails.has(email)));

  return { errors, applied: withLogins };
}

/**
 * Drop rows that this persist tried to add but did not keep, without touching
 * newer local edits that landed after the persist snapshot was taken.
 */
export function dropUnpersisted(
  current: DataState,
  attempted: DataState,
  applied: DataState,
): DataState {
  const next = cloneState(current);
  for (const col of COLLECTIONS) {
    const getId = col.getId as (item: unknown) => string;
    const appliedIds = new Set(
      ((applied[col.key] as unknown[]) ?? []).map((item) => getId(item)).filter(Boolean),
    );
    const attemptedIds = new Set(
      ((attempted[col.key] as unknown[]) ?? []).map((item) => getId(item)).filter(Boolean),
    );
    const rolledBack = [...attemptedIds].filter((id) => !appliedIds.has(id));
    if (rolledBack.length === 0) continue;
    const drop = new Set(rolledBack);
    (next[col.key] as unknown[]) = ((current[col.key] as unknown[]) ?? []).filter(
      (item) => !drop.has(getId(item)),
    );
  }
  return next;
}

export function applyRealtimeChange(
  state: DataState,
  table: string,
  event: string,
  row: Row,
): DataState {
  const col = COLLECTIONS.find((c) => c.table === table);
  if (!col) return state;
  if (col.table === "app_users" && !isLoginRole(String(row.role ?? ""))) {
    const dropId = String(row.id ?? "");
    return {
      ...state,
      users: state.users.filter((u) => u.id !== dropId),
    };
  }
  const item = col.fromRow(row);
  const id = (col.getId as (i: unknown) => string)(item);
  const list = state[col.key] as unknown[];
  const getId = col.getId as (i: unknown) => string;

  if (event === "DELETE") {
    return { ...state, [col.key]: list.filter((x) => getId(x) !== id) };
  }

  const idx = list.findIndex((x) => getId(x) === id);
  if (idx === -1) {
    return { ...state, [col.key]: [item, ...list] };
  }
  const copy = list.slice();
  const existing = copy[idx] as { folder?: string };
  const incoming = item as { folder?: string };
  copy[idx] =
    col.key === "documents"
      ? { ...(item as object), folder: incoming.folder ?? existing.folder }
      : item;
  return { ...state, [col.key]: copy };
}

export function subscribeToData(
  onChange: (table: string, event: string, row: Row) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;

  let channel = supabase.channel("altman-db");
  for (const col of COLLECTIONS) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: col.table },
      (payload) => {
        const event = payload.eventType;
        const row = (event === "DELETE" ? payload.old : payload.new) as Row;
        if (row && Object.keys(row).length > 0) onChange(col.table, event, row);
      },
    );
  }
  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export { seedState };
