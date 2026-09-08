-- Catchup: live project never received 007/008, so withdrawals vanish after reload.
-- Idempotent: safe to run on a project that already has the table.

create table if not exists public.withdrawal_requests (
  id text primary key,
  landlord_id text not null,
  property_id text,
  lease_id text,
  amount double precision not null default 0,
  rent_amount double precision not null default 0,
  rent_due_date text,
  note text,
  status text not null default 'pending',
  created_at text not null,
  created_by_user_id text not null,
  decided_at text,
  decided_by_user_id text,
  decision_note text
);

create index if not exists withdrawal_requests_landlord_idx
  on public.withdrawal_requests (landlord_id);

create index if not exists withdrawal_requests_status_idx
  on public.withdrawal_requests (status);

grant all on table public.withdrawal_requests to anon, authenticated;

alter table public.withdrawal_requests enable row level security;

drop policy if exists anon_all on public.withdrawal_requests;
create policy anon_all on public.withdrawal_requests for all using (true) with check (true);

do $$
begin
  execute 'alter publication supabase_realtime add table public.withdrawal_requests';
exception
  when duplicate_object then null;
end $$;

alter table public.withdrawal_requests
  alter column property_id drop not null;
