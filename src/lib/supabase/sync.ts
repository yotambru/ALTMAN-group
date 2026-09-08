import type { DataState } from "@/lib/data-state";
import { emptyState, seedState } from "@/lib/data-state";
import { getSupabase } from "@/lib/supabase/client";
import { hydrateFileFields, stillEmbedded, warmSignedUrls } from "@/lib/supabase/files";
import { COLLECTIONS, type Row } from "@/lib/supabase/mappers";
import { isLoginRole } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Upsert a row; if PostgREST rejects unknown columns (migrations not applied yet),
 * drop those columns and retry so leases/docs still persist.
 * Always start with the full row so a just-applied migration (e.g. documents.folder)
 * begins persisting without a reload.
 */
async function upsertRow(
  supabase: SupabaseClient,
  table: string,
  row: Row,
): Promise<string | null> {
  let current: Row = { ...row };
  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase.from(table).upsert(current);
    if (!error) return null;
    const missing = parseMissingColumn(error.message);
    if (!missing || !(missing in current)) return error.message;
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

export async function persistDiff(prev: DataState, next: DataState): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const errors: string[] = [];
  const snapshots = COLLECTIONS.map((col) => {
    const prevList = (prev[col.key] as unknown[] | undefined) ?? [];
    const nextList = (next[col.key] as unknown[] | undefined) ?? [];
    const getId = col.getId as (item: unknown) => string;
    return {
      col,
      prevMap: new Map(prevList.map((item) => [getId(item), item])),
      nextMap: new Map(nextList.map((item) => [getId(item), item])),
    };
  });

  // Deletes first so removed people/rows cannot come back if a later upsert fails.
  for (const { col, prevMap, nextMap } of snapshots) {
    const removedIds = [...prevMap.keys()].filter((id) => id && !nextMap.has(id));
    if (removedIds.length === 0) continue;

    const { error } = await supabase.from(col.table).delete().in(col.idColumn, removedIds);
    if (!error) continue;
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
      }
    }
  }

  for (const { col, prevMap, nextMap } of snapshots) {
    for (const [id, item] of nextMap) {
      const old = prevMap.get(id);
      if (old && JSON.stringify(old) === JSON.stringify(item)) continue;
      const prepared = await hydrateFileFields(col.key, item as Record<string, unknown>);
      if (stillEmbedded(prepared)) {
        const full = `${col.table}/${id}: העלאת קובץ לשרת נכשלה — המסמך לא נשמר`;
        console.error(`[supabase] upsert ${full}`);
        errors.push(full);
        continue;
      }
      const message = await upsertRow(supabase, col.table, col.toRow(prepared as never));
      if (message) {
        if (isMissingRelation(message)) {
          const full = `${col.table}/${id}: הטבלה חסרה בשרת — הבקשה לא נשמרה`;
          console.error(`[supabase] upsert ${full}`);
          errors.push(full);
          continue;
        }
        const full = `${col.table}/${id}: ${message}`;
        console.error(`[supabase] upsert ${full}`);
        errors.push(full);
      }
    }
  }

  return errors;
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
