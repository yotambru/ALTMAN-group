-- ALTMAN Group — shared domain schema (demo RLS is open to anon).
-- Apply in the Supabase SQL editor, or: supabase db push

-- ---------- tables ----------

create table if not exists public.app_users (
  id text primary key,
  full_name text not null,
  role text not null,
  email text,
  phone text,
  avatar_url text,
  landlord_id text,
  tenant_id text,
  professional_id text
);

create table if not exists public.landlords (
  id text primary key,
  full_name text not null,
  phone text not null default '',
  email text not null default '',
  property_ids text[] not null default '{}',
  id_number text,
  id_photo_uploaded boolean,
  management_fee_percent double precision,
  check_deposit_mode text
);

create table if not exists public.properties (
  id text primary key,
  address text not null,
  city text not null,
  apartment_number text not null default '',
  floor integer not null default 0,
  size_sqm double precision not null default 0,
  rooms double precision not null default 0,
  bathrooms double precision not null default 0,
  status text not null default 'vacant',
  value double precision not null default 0,
  municipal_tax double precision not null default 0,
  municipal_property_number text,
  building_fee double precision not null default 0,
  electricity_meter text not null default '',
  image_id text not null default 'residential',
  landlord_id text not null,
  tenant_id text,
  neighborhood text,
  has_inspection_report boolean,
  has_balcony boolean,
  balcony_sqm double precision,
  has_elevator boolean,
  toilets double precision,
  pets_allowed boolean,
  accessible boolean,
  air_directions text[],
  has_parking boolean,
  parking_number text,
  has_storage boolean,
  storage_number text,
  listed_rent double precision,
  entry_date text,
  keys_received integer,
  subcontractor_phones text,
  management_company_phone text,
  gas_meter text,
  water_meter text
);

create table if not exists public.tenants (
  id text primary key,
  full_name text not null,
  phone text not null default '',
  email text not null default '',
  property_id text not null,
  lease_id text not null,
  id_number text,
  id_photo_uploaded boolean
);

create table if not exists public.leases (
  id text primary key,
  property_id text not null,
  tenant_id text not null,
  landlord_id text not null,
  monthly_rent double precision not null default 0,
  start_date text not null default '',
  end_date text not null default '',
  next_payment_date text not null default '',
  active boolean not null default true,
  management_start_date text,
  management_end_date text,
  option_date text,
  guarantee_expiry text,
  insurance_renewal_date text,
  management_fee_percent double precision,
  management_fee_before_vat double precision,
  management_fee_inc_vat double precision
);

create table if not exists public.payments (
  id text primary key,
  lease_id text not null,
  amount double precision not null default 0,
  due_date text not null,
  status text not null default 'upcoming',
  method text,
  check_number text,
  deposit_date text,
  clearance_confirmed boolean,
  clearance_confirmed_at text
);

create table if not exists public.expenses (
  id text primary key,
  landlord_id text not null,
  property_id text,
  amount double precision not null default 0,
  date text not null,
  description text not null default '',
  invoice_doc_id text
);

create table if not exists public.tickets (
  id text primary key,
  property_id text not null,
  created_by_id text not null,
  title text not null,
  description text not null default '',
  category text not null default '',
  priority text not null default 'medium',
  status text not null default 'open',
  created_at text not null,
  photo_data_url text,
  assigned_professional_id text,
  scheduled_at text,
  resolution_notes text,
  invoice_doc_id text,
  updates jsonb not null default '[]'
);

create table if not exists public.documents (
  id text primary key,
  name text not null,
  type text not null,
  property_id text,
  landlord_id text,
  tenant_id text,
  created_at text not null,
  signed boolean not null default false,
  status text,
  owner_user_id text,
  signed_by_name text,
  signed_at text,
  file_data_url text
);

create table if not exists public.notifications (
  id text primary key,
  kind text not null,
  title text not null,
  body text not null default '',
  created_at text not null,
  read boolean not null default false,
  for_user_id text,
  for_role text,
  action_required boolean,
  related_id text
);

create table if not exists public.professionals (
  id text primary key,
  full_name text not null,
  trade text not null default '',
  phone text not null default '',
  email text,
  rating double precision,
  active boolean not null default true
);

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text,
  assignee_user_id text,
  due_date text,
  status text not null default 'open',
  created_at text not null,
  created_by_id text not null,
  related_ticket_id text,
  related_property_id text
);

create table if not exists public.chat_threads (
  id text primary key,
  participant_ids text[] not null,
  title text not null default ''
);

create table if not exists public.chat_messages (
  id text primary key,
  thread_id text not null,
  from_user_id text not null,
  from_role text not null,
  text text not null default '',
  created_at text not null
);

create table if not exists public.onboardings (
  tenant_id text primary key,
  lease_id text not null,
  move_in_date text not null,
  utilities jsonb not null default '[]',
  insurance jsonb not null default '{"status":"pending"}',
  ac_filter_last_cleaned text,
  completed boolean not null default false
);

create table if not exists public.protocols (
  id text primary key,
  property_id text not null,
  lease_id text,
  type text not null,
  date text not null,
  meter_electricity text,
  meter_water text,
  meter_gas text,
  items jsonb not null default '[]',
  photo_data_urls text[] not null default '{}',
  keys_handed_over boolean not null default false,
  signed_by_tenant boolean not null default false,
  signed_by_manager boolean not null default false,
  notes text
);

create table if not exists public.activity_log (
  id text primary key,
  at text not null,
  user_id text not null,
  user_name text not null,
  role text not null,
  action text not null,
  entity text,
  entity_id text,
  details text
);

-- ---------- indexes ----------

create index if not exists properties_landlord_id_idx on public.properties (landlord_id);
create index if not exists leases_property_id_idx on public.leases (property_id);
create index if not exists payments_lease_id_idx on public.payments (lease_id);
create index if not exists tickets_property_id_idx on public.tickets (property_id);
create index if not exists documents_property_id_idx on public.documents (property_id);
create index if not exists chat_messages_thread_id_idx on public.chat_messages (thread_id);
create index if not exists notifications_for_user_id_idx on public.notifications (for_user_id);

-- ---------- grants + open RLS (demo) ----------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.app_users,
  public.landlords,
  public.properties,
  public.tenants,
  public.leases,
  public.payments,
  public.expenses,
  public.tickets,
  public.documents,
  public.notifications,
  public.professionals,
  public.tasks,
  public.chat_threads,
  public.chat_messages,
  public.onboardings,
  public.protocols,
  public.activity_log
to anon, authenticated;

alter table public.app_users enable row level security;
alter table public.landlords enable row level security;
alter table public.properties enable row level security;
alter table public.tenants enable row level security;
alter table public.leases enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.tickets enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.professionals enable row level security;
alter table public.tasks enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.onboardings enable row level security;
alter table public.protocols enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists anon_all on public.app_users;
drop policy if exists anon_all on public.landlords;
drop policy if exists anon_all on public.properties;
drop policy if exists anon_all on public.tenants;
drop policy if exists anon_all on public.leases;
drop policy if exists anon_all on public.payments;
drop policy if exists anon_all on public.expenses;
drop policy if exists anon_all on public.tickets;
drop policy if exists anon_all on public.documents;
drop policy if exists anon_all on public.notifications;
drop policy if exists anon_all on public.professionals;
drop policy if exists anon_all on public.tasks;
drop policy if exists anon_all on public.chat_threads;
drop policy if exists anon_all on public.chat_messages;
drop policy if exists anon_all on public.onboardings;
drop policy if exists anon_all on public.protocols;
drop policy if exists anon_all on public.activity_log;

create policy anon_all on public.app_users for all using (true) with check (true);
create policy anon_all on public.landlords for all using (true) with check (true);
create policy anon_all on public.properties for all using (true) with check (true);
create policy anon_all on public.tenants for all using (true) with check (true);
create policy anon_all on public.leases for all using (true) with check (true);
create policy anon_all on public.payments for all using (true) with check (true);
create policy anon_all on public.expenses for all using (true) with check (true);
create policy anon_all on public.tickets for all using (true) with check (true);
create policy anon_all on public.documents for all using (true) with check (true);
create policy anon_all on public.notifications for all using (true) with check (true);
create policy anon_all on public.professionals for all using (true) with check (true);
create policy anon_all on public.tasks for all using (true) with check (true);
create policy anon_all on public.chat_threads for all using (true) with check (true);
create policy anon_all on public.chat_messages for all using (true) with check (true);
create policy anon_all on public.onboardings for all using (true) with check (true);
create policy anon_all on public.protocols for all using (true) with check (true);
create policy anon_all on public.activity_log for all using (true) with check (true);

-- ---------- realtime ----------

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_users', 'landlords', 'properties', 'tenants', 'leases', 'payments',
    'expenses', 'tickets', 'documents', 'notifications', 'professionals',
    'tasks', 'chat_threads', 'chat_messages', 'onboardings', 'protocols',
    'activity_log'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- storage ----------

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

drop policy if exists uploads_select on storage.objects;
drop policy if exists uploads_insert on storage.objects;
drop policy if exists uploads_update on storage.objects;
drop policy if exists uploads_delete on storage.objects;

create policy uploads_select on storage.objects
  for select using (bucket_id = 'uploads');
create policy uploads_insert on storage.objects
  for insert with check (bucket_id = 'uploads');
create policy uploads_update on storage.objects
  for update using (bucket_id = 'uploads');
create policy uploads_delete on storage.objects
  for delete using (bucket_id = 'uploads');
