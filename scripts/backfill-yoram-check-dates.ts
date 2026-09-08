/**
 * Set Yoram Neaman's check clearance dates to the lease-start day each month.
 *
 * Uses PostgREST directly (no Realtime / WebSocket) so it runs on Node 20+.
 *
 * Usage: npx tsx scripts/backfill-yoram-check-dates.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  defaultChecksForLease,
  paymentStatusForDate,
} from "../src/lib/check-schedule";
import { localTodayIso } from "../src/lib/lease-periods";
import type { RentAdjustment } from "../src/types";

function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!fsExists(path)) continue;
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

function fsExists(path: string): boolean {
  return existsSync(path);
}

type Row = Record<string, unknown>;

function restBase(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
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

async function remove(table: string, match: string): Promise<void> {
  const { status, body } = await api(`${table}?${match}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  if (status >= 400) throw new Error(`${table} delete failed (${status}): ${body}`);
}

function parseRentAdjustments(value: unknown): RentAdjustment[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const rec = entry as Record<string, unknown>;
    const date = String(rec.date ?? "");
    const monthlyRent = Number(rec.monthlyRent ?? rec.monthly_rent) || 0;
    return date && monthlyRent > 0 ? [{ date: date.slice(0, 10), monthlyRent }] : [];
  });
  return items.length > 0 ? items : undefined;
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

async function main(): Promise<void> {
  loadEnv();
  const today = localTodayIso();

  const landlords = await select<Row>(
    "landlords",
    "select=id,full_name&or=(full_name.ilike.*יורם*נאמן*,email.ilike.yoramirkam@gmail.com)",
  );
  if (landlords.length === 0) {
    console.log("No matching landlord found.");
    return;
  }

  let inserted = 0;
  let removed = 0;
  let leasesUpdated = 0;

  for (const landlord of landlords) {
    const landlordId = String(landlord.id);
    const leases = await select<Row>(
      "leases",
      `select=*&landlord_id=eq.${landlordId}`,
    );

    for (const lease of leases) {
      const leaseId = String(lease.id);
      const startDate = String(lease.start_date ?? "").slice(0, 10);
      const endDate = String(lease.end_date ?? "").slice(0, 10);
      const rent =
        Number(lease.starting_monthly_rent) || Number(lease.monthly_rent) || 0;
      if (!startDate || rent <= 0) {
        console.log(`skip lease ${leaseId}: missing start date or rent`);
        continue;
      }

      const checks = defaultChecksForLease({
        startDate,
        endDate: endDate || undefined,
        startingMonthlyRent: rent,
        rentAdjustments: parseRentAdjustments(lease.rent_adjustments),
      }).filter((check) => check.clearanceDate >= today);
      if (!checks.length) {
        console.log(`skip lease ${leaseId}: empty generated schedule`);
        continue;
      }

      const existing = await select<Row>(
        "payments",
        `select=*&lease_id=eq.${leaseId}`,
      );
      const kept = existing.filter(
        (row) => row.clearance_confirmed === true || row.status === "paid",
      );
      const keptDates = new Set(
        kept.map((row) => String(row.deposit_date || row.due_date || "").slice(0, 10)),
      );

      for (const row of existing) {
        if (kept.some((item) => item.id === row.id)) continue;
        await remove("payments", `id=eq.${String(row.id)}`);
        removed += 1;
      }

      for (const check of checks) {
        const day = check.clearanceDate.slice(0, 10);
        if (keptDates.has(day)) continue;
        await upsert("payments", {
          id: generateId("pay"),
          lease_id: leaseId,
          amount: check.amount,
          due_date: day,
          deposit_date: day,
          status: paymentStatusForDate(day, false, today),
          method: "check",
          check_number: check.checkNumber ?? null,
          clearance_confirmed: null,
          clearance_confirmed_at: null,
        });
        inserted += 1;
      }

      const nextPaymentDate = checks[0]?.clearanceDate || startDate;
      await patch("leases", `id=eq.${leaseId}`, {
        next_payment_date: nextPaymentDate,
      });
      leasesUpdated += 1;
      console.log(
        `lease ${leaseId}: ${checks.length} monthly dates from ${startDate}` +
          (endDate ? ` → ${endDate}` : ""),
      );
    }
  }

  console.log(
    `Done. leases=${leasesUpdated} inserted=${inserted} removed_unclear=${removed}`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
