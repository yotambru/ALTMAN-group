-- Pending lease fields on a renewal document, applied when the tenant signs.

alter table public.documents
  add column if not exists pending_lease_update jsonb;
