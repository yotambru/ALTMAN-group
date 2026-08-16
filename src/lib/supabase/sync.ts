import type { DataState } from "@/lib/data-state";
import { seedState } from "@/lib/data-state";
import { getSupabase } from "@/lib/supabase/client";
import { hydrateFileFields, stillEmbedded } from "@/lib/supabase/files";
import { COLLECTIONS, type Row } from "@/lib/supabase/mappers";

function emptyState(): DataState {
  return {
    users: [],
    landlords: [],
    properties: [],
    tenants: [],
    leases: [],
    payments: [],
    expenses: [],
    tickets: [],
    documents: [],
    notifications: [],
    professionals: [],
    tasks: [],
    chatThreads: [],
    chatMessages: [],
    onboardings: [],
    protocols: [],
    activityLog: [],
  };
}

export async function fetchAll(): Promise<DataState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const next = emptyState();
  const results = await Promise.all(
    COLLECTIONS.map(async (col) => {
      const { data, error } = await supabase.from(col.table).select("*");
      if (error) throw error;
      return { key: col.key, rows: (data ?? []) as Row[], col };
    }),
  );

  for (const { key, rows, col } of results) {
    (next[key] as unknown[]) = rows.map((row) => col.fromRow(row));
  }
  return next;
}

export async function persistDiff(prev: DataState, next: DataState): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const errors: string[] = [];

  for (const col of COLLECTIONS) {
    const prevList = prev[col.key] as unknown[];
    const nextList = next[col.key] as unknown[];
    const getId = col.getId as (item: unknown) => string;
    const prevMap = new Map(prevList.map((item) => [getId(item), item]));
    const nextMap = new Map(nextList.map((item) => [getId(item), item]));

    for (const [id, item] of nextMap) {
      const old = prevMap.get(id);
      if (old && JSON.stringify(old) === JSON.stringify(item)) continue;
      const prepared = await hydrateFileFields(col.key, item as Record<string, unknown>);
      if (stillEmbedded(prepared)) continue;
      const { error } = await supabase.from(col.table).upsert(col.toRow(prepared as never));
      if (error) {
        const message = `${col.table}/${id}: ${error.message}`;
        console.error(`[supabase] upsert ${message}`);
        errors.push(message);
      }
    }

    for (const [id] of prevMap) {
      if (nextMap.has(id)) continue;
      const { error } = await supabase.from(col.table).delete().eq(col.idColumn, id);
      if (error) {
        const message = `${col.table}/${id}: ${error.message}`;
        console.error(`[supabase] delete ${message}`);
        errors.push(message);
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
  copy[idx] = item;
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
