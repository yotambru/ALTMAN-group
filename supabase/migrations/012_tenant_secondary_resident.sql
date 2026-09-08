-- Second resident on a tenancy (בעל/אישה): contact fields; login is a separate
-- app_users row sharing the same tenant_id.

alter table public.tenants
  add column if not exists secondary_full_name text,
  add column if not exists secondary_phone text,
  add column if not exists secondary_email text,
  add column if not exists secondary_id_number text;
