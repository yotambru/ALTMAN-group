import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { seedState } from "../src/lib/data-state";
import { createServiceClient } from "../src/lib/supabase/client";
import { COLLECTIONS } from "../src/lib/supabase/mappers";

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
    const { error } = await supabase.from(col.table).upsert(rows);
    if (error) {
      throw new Error(`${col.table}: ${error.message}`);
    }
    console.log(`upserted ${rows.length} → ${col.table}`);
  }

  console.log("Seed complete.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
