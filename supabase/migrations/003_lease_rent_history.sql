-- Rent history so the income graph can start at join-date rent
-- and step up on each subsequent update.
alter table public.leases
  add column if not exists starting_monthly_rent double precision,
  add column if not exists rent_adjustments jsonb;
