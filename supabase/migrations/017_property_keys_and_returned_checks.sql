-- Structured key counts (apartment / storage / mailbox) and bounced-check reports.

alter table public.properties
  add column if not exists keys_apartment integer,
  add column if not exists keys_storage integer,
  add column if not exists keys_mailbox integer;

alter table public.payments
  add column if not exists check_returned boolean,
  add column if not exists check_returned_at timestamptz;
