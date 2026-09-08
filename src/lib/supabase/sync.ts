import type { DataState } from "@/lib/data-state";
import { emptyState, seedState } from "@/lib/data-state";
import { getSupabase } from "@/lib/supabase/client";
import { hydrateFileFields, stillEmbedded, warmSignedUrls } from "@/lib/supabase/files";
import { COLLECTIONS, type Row } from "@/lib/supabase/mappers";
import { isLoginRole } from "@/types";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

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
): Promise<string | null> {
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
      return null;
    }
    if (mode === "insert" && isUniqueViolation(result.error)) {
      return null;
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

  for (const { col, getId, prevMap, nextMap } of snapshots) {
    for (const [id, item] of nextMap) {
      const old = prevMap.get(id);
      if (old && JSON.stringify(old) === JSON.stringify(item)) continue;
      const prepared = await hydrateFileFields(col.key, item as Record<string, unknown>);
      if (stillEmbedded(prepared)) {
        const full = `${col.table}/${id}: העלאת קובץ לשרת נכשלה — המסמך לא נשמר`;
        console.error(`[supabase] write ${full}`);
        errors.push(full);
        continue;
      }
      const message = await writeRow(
        supabase,
        col.table,
        col.toRow(prepared as never),
        old ? "update" : "insert",
        col.idColumn,
        id,
      );
      if (message) {
        if (isMissingRelation(message)) {
          const full = `${col.table}/${id}: הטבלה חסרה בשרת — הבקשה לא נשמרה`;
          console.error(`[supabase] write ${full}`);
          errors.push(full);
          continue;
        }
        const full = `${col.table}/${id}: ${message}`;
        console.error(`[supabase] write ${full}`);
        errors.push(full);
        continue;
      }
      (applied[col.key] as unknown[]) = replaceById(
        applied[col.key] as unknown[],
        getId,
        id,
        item,
      );
    }
  }

  return { errors, applied };
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
