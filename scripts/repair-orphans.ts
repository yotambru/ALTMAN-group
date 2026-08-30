/**
 * Repair tenants whose lease/onboarding failed to persist (schema lag),
 * and normalize Yoram Neeman login email to yoramirkam@gmail.com.
 *
 * Uses PostgREST directly (no Realtime / WebSocket) so it runs on Node 20+.
 *
 * Usage: npx tsx scripts/repair-orphans.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

type Row = Record<string, unknown>;

const ALL_UTILITIES = ["arnona", "water", "electricity", "gas", "vaad"] as const;

function restBase(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or key in .env.local");
  return { url: url.replace(/\/$/, ""), key };
}

async function api(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<{ status: number; body: string }> {
  const { url, key } = restBase();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  if (init.prefer) headers.set("Prefer", init.prefer);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers });
  return { status: res.status, body: await res.text() };
}

async function select<T extends Row>(table: string, query: string): Promise<T[]> {
  const { status, body } = await api(`${table}?${query}`);
  if (status >= 400) throw new Error(`${table} select failed (${status}): ${body}`);
  return JSON.parse(body) as T[];
}

async function upsert(table: string, row: Row): Promise<void> {
  const { status, body } = await api(table, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(row),
  });
  if (status < 400) return;
  throw new Error(`${table} upsert failed (${status}): ${body}`);
}

async function patch(table: string, match: string, row: Row): Promise<void> {
  const { status, body } = await api(`${table}?${match}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify(row),
  });
  if (status >= 400) throw new Error(`${table} patch failed (${status}): ${body}`);
}

async function upsertLease(row: Row): Promise<void> {
  try {
    await upsert("leases", row);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/starting_monthly_rent|rent_adjustments|does not exist|Could not find/i.test(message)) {
      throw err;
    }
    const stripped = { ...row };
    delete stripped.starting_monthly_rent;
    delete stripped.rent_adjustments;
    await upsert("leases", stripped);
  }
}

async function main(): Promise<void> {
  loadEnv();

  const targetEmail = "yoramirkam@gmail.com";
  const wrongEmail = "yotamirkam@gmail.com";

  const landlords = await select<Row>(
    "landlords",
    `select=*&or=(email.ilike.${wrongEmail},email.ilike.${targetEmail},full_name.ilike.*יורם*נאמן*)`,
  );

  for (const landlord of landlords) {
    const landlordId = String(landlord.id);
    if (landlord.email !== targetEmail) {
      await patch("landlords", `id=eq.${landlordId}`, { email: targetEmail });
      console.log(`landlord ${landlordId}: email → ${targetEmail}`);
    } else {
      console.log(`landlord ${landlordId}: email already ${targetEmail}`);
    }

    const users = await select<Row>("app_users", `select=*&landlord_id=eq.${landlordId}`);
    for (const user of users) {
      if (user.email !== targetEmail) {
        await patch("app_users", `id=eq.${String(user.id)}`, { email: targetEmail });
        console.log(`user ${user.id}: email → ${targetEmail}`);
      }
    }

    const byEmail = await select<Row>(
      "app_users",
      `select=id&email=eq.${encodeURIComponent(targetEmail)}`,
    );
    if (byEmail.length === 0) {
      const id = `u_${Math.random().toString(36).slice(2, 9)}`;
      await upsert("app_users", {
        id,
        full_name: landlord.full_name,
        role: "landlord",
        email: targetEmail,
        phone: landlord.phone,
        landlord_id: landlordId,
      });
      console.log(`created landlord login ${id} for ${targetEmail}`);
    }
  }

  const tenants = await select<Row>("tenants", "select=*");
  const leases = await select<Row>("leases", "select=id");
  const onboardings = await select<Row>("onboardings", "select=tenant_id");
  const leaseIds = new Set(leases.map((l) => String(l.id)));
  const onbIds = new Set(onboardings.map((o) => String(o.tenant_id)));

  for (const tenant of tenants) {
    const propertyId = String(tenant.property_id);
    const leaseId = String(tenant.lease_id);
    const tenantId = String(tenant.id);

    const props = await select<Row>("properties", `select=*&id=eq.${propertyId}`);
    const property = props[0];
    if (!property) {
      console.warn(`skip ${tenantId}: property ${propertyId} missing`);
      continue;
    }

    if (!leaseIds.has(leaseId)) {
      const start = String(property.entry_date || new Date().toISOString().slice(0, 10));
      const rent = Number(property.listed_rent) || 0;
      await upsertLease({
        id: leaseId,
        property_id: propertyId,
        tenant_id: tenantId,
        landlord_id: property.landlord_id,
        monthly_rent: rent,
        starting_monthly_rent: rent || null,
        rent_adjustments: null,
        start_date: start,
        end_date: "",
        next_payment_date: start,
        active: true,
      });
      leaseIds.add(leaseId);
      console.log(
        `recreated lease ${leaseId} for ${tenant.full_name} @ ₪${rent} from ${start}`,
      );
    }

    if (!onbIds.has(tenantId)) {
      const leaseRows = await select<Row>("leases", `select=start_date&id=eq.${leaseId}`);
      const moveIn = String(
        leaseRows[0]?.start_date ||
          property.entry_date ||
          new Date().toISOString().slice(0, 10),
      );
      await upsert("onboardings", {
        tenant_id: tenantId,
        lease_id: leaseId,
        move_in_date: moveIn,
        utilities: ALL_UTILITIES.map((utility) => ({ utility, status: "pending" })),
        insurance: { status: "pending" },
        completed: false,
      });
      onbIds.add(tenantId);
      console.log(`recreated onboarding for ${tenant.full_name} (${tenantId})`);
    }
  }

  console.log("Repair complete.");
  console.log(
    "Note: documents that failed to persist earlier cannot be recovered — re-upload lease/ID/management files.",
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
