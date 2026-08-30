-- Apply pending schema that production was missing.
-- Without these, lease/document/photo upserts fail and data silently disappears after refresh.
-- Run in Supabase SQL Editor (or `supabase db push`) on the live project.

-- 003_lease_rent_history.sql
alter table public.leases
  add column if not exists starting_monthly_rent double precision,
  add column if not exists rent_adjustments jsonb;

-- 004_property_photos.sql
alter table public.properties
  add column if not exists photo_urls text[] not null default '{}';

-- 005_document_folder.sql
alter table public.documents
  add column if not exists folder text;
