import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { seedState } from "../src/lib/data-state";
import { createServiceClient } from "../src/lib/supabase/client";
import { COLLECTIONS } from "../src/lib/supabase/mappers";
import { provisionAuthUser } from "../src/lib/supabase/account-admin";

const DEFAULT_SEED_PASSWORD = "Altman1234";

function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
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

async function upsertRows(
  supabase: ReturnType<typeof createServiceClient>,
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  let current = rows.map((row) => ({ ...row }));
  for (let attempt = 0; attempt < 10; attempt++) {
    const { error } = await supabase.from(table).upsert(current);
    if (!error) return;
    const missing = parseMissingColumn(error.message);
    if (!missing || !current.some((row) => missing in row)) {
      throw new Error(`${table}: ${error.message}`);
    }
    console.warn(`schema lag — omitting ${table}.${missing}`);
    current = current.map((row) => {
      const next = { ...row };
      delete next[missing];
      return next;
    });
  }
  throw new Error(`${table}: schema fallback retries exhausted`);
}

async function main(): Promise<void> {
  loadEnv();
  const supabase = createServiceClient();
  const state = seedState();

  for (const col of COLLECTIONS) {
    const items = state[col.key] as unknown[];
    if (items.length === 0) {
      console.log(`skip ${col.table} (empty)`);
      continue;
    }
    const rows = items.map((item) => col.toRow(item as never));
    await upsertRows(supabase, col.table, rows);
    console.log(`upserted ${rows.length} → ${col.table}`);
  }

  const password = process.env.SEED_DEMO_PASSWORD || DEFAULT_SEED_PASSWORD;
  if (password.length < 8) {
    throw new Error("SEED_DEMO_PASSWORD must be at least 8 characters.");
  }

  const { data: appUsers, error: usersError } = await supabase
    .from("app_users")
    .select("id, email, auth_user_id")
    .not("email", "is", null);
  if (usersError) throw new Error(`app_users: ${usersError.message}`);

  for (const row of appUsers ?? []) {
    const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) continue;
    if (row.auth_user_id) {
      console.log(`auth already linked ← ${email}`);
      continue;
    }
    await provisionAuthUser(supabase, email, password, String(row.id));
    console.log(`auth user ← ${email}`);
  }

  console.log("Seed complete.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
