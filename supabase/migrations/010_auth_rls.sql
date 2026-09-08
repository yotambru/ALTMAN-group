-- Real auth + role-scoped RLS. Replaces the prototype anon_all policies.
-- Safe to re-run. Creates withdrawal_requests if 007–009 were never applied.

-- ---------- ensure withdrawal_requests (live projects may have skipped 007–009) ----------

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

alter table public.withdrawal_requests enable row level security;

do $$
begin
  execute 'alter publication supabase_realtime add table public.withdrawal_requests';
exception
  when duplicate_object then null;
end $$;

-- ---------- link app users to Supabase Auth ----------

alter table public.app_users
  add column if not exists auth_user_id uuid unique;

do $$
begin
  alter table public.app_users
    add constraint app_users_auth_user_id_fkey
    foreign key (auth_user_id) references auth.users (id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create unique index if not exists app_users_auth_user_id_uidx
  on public.app_users (auth_user_id)
  where auth_user_id is not null;

-- ---------- session helpers (security definer, bypass RLS for lookup only) ----------

create or replace function public.app_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.app_users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.app_users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.app_landlord_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select landlord_id from public.app_users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.app_tenant_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.app_users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.app_role() in ('manager', 'assistant'), false);
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.app_role() = 'manager', false);
$$;

create or replace function public.can_see_property(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_id is not null and (
      public.is_staff()
      or exists (
        select 1 from public.properties p
        where p.id = p_id
          and (
            p.landlord_id = public.app_landlord_id()
            or p.tenant_id = public.app_tenant_id()
          )
      )
    );
$$;

create or replace function public.can_see_lease(l_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    l_id is not null and (
      public.is_staff()
      or exists (
        select 1 from public.leases l
        where l.id = l_id
          and (
            l.landlord_id = public.app_landlord_id()
            or l.tenant_id = public.app_tenant_id()
          )
      )
    );
$$;

revoke all on function public.app_user_id() from public, anon;
revoke all on function public.app_role() from public, anon;
revoke all on function public.app_landlord_id() from public, anon;
revoke all on function public.app_tenant_id() from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_manager() from public, anon;
revoke all on function public.can_see_property(text) from public, anon;
revoke all on function public.can_see_lease(text) from public, anon;

grant execute on function public.app_user_id() to authenticated;
grant execute on function public.app_role() to authenticated;
grant execute on function public.app_landlord_id() to authenticated;
grant execute on function public.app_tenant_id() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.can_see_property(text) to authenticated;
grant execute on function public.can_see_lease(text) to authenticated;

-- ---------- prevent privilege escalation on app_users ----------

create or replace function public.protect_app_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_staff() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role
      or new.auth_user_id is distinct from old.auth_user_id
      or new.landlord_id is distinct from old.landlord_id
      or new.tenant_id is distinct from old.tenant_id
      or new.professional_id is distinct from old.professional_id
      or new.id is distinct from old.id
    then
      raise exception 'not allowed to change account identity fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_app_users on public.app_users;
create trigger protect_app_users
  before update on public.app_users
  for each row execute function public.protect_app_users();

create or replace function public.protect_properties()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_staff() then
    return new;
  end if;
  if new.landlord_id is distinct from old.landlord_id
    or new.id is distinct from old.id
  then
    raise exception 'not allowed to change property ownership';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_properties on public.properties;
create trigger protect_properties
  before update on public.properties
  for each row execute function public.protect_properties();

-- ---------- grants: no anon table access ----------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'app_users', 'landlords', 'properties', 'tenants', 'leases', 'payments',
    'expenses', 'tickets', 'documents', 'notifications', 'professionals',
    'tasks', 'chat_threads', 'chat_messages', 'onboardings', 'protocols',
    'activity_log', 'withdrawal_requests'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'grant select, insert, update, delete on public.%I to authenticated',
        t
      );
    end if;
  end loop;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_users'
      and column_name = 'password_hash'
  ) then
    execute 'revoke select (password_hash) on public.app_users from anon, authenticated';
  end if;
end $$;

-- ---------- drop every existing policy on domain tables ----------

do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'app_users', 'landlords', 'properties', 'tenants', 'leases', 'payments',
        'expenses', 'tickets', 'documents', 'notifications', 'professionals',
        'tasks', 'chat_threads', 'chat_messages', 'onboardings', 'protocols',
        'activity_log', 'withdrawal_requests'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- app_users
create policy app_users_select on public.app_users
  for select using (
    public.is_staff()
    or id = public.app_user_id()
    or role in ('manager', 'assistant')
    or (
      public.app_role() = 'landlord'
      and tenant_id is not null
      and public.can_see_property((select t.property_id from public.tenants t where t.id = app_users.tenant_id))
    )
  );
create policy app_users_insert on public.app_users
  for insert with check (
    public.is_staff()
    or (public.app_role() = 'landlord' and role = 'tenant')
  );
create policy app_users_update on public.app_users
  for update using (public.is_staff() or id = public.app_user_id())
  with check (public.is_staff() or id = public.app_user_id());
create policy app_users_delete on public.app_users
  for delete using (public.is_manager());

-- landlords
create policy landlords_select on public.landlords
  for select using (public.is_staff() or id = public.app_landlord_id());
create policy landlords_insert on public.landlords
  for insert with check (public.is_staff());
create policy landlords_update on public.landlords
  for update using (public.is_staff() or id = public.app_landlord_id())
  with check (public.is_staff() or id = public.app_landlord_id());
create policy landlords_delete on public.landlords
  for delete using (public.is_manager());

-- properties
create policy properties_select on public.properties
  for select using (
    public.is_staff()
    or landlord_id = public.app_landlord_id()
    or tenant_id = public.app_tenant_id()
  );
create policy properties_insert on public.properties
  for insert with check (public.is_staff());
create policy properties_update on public.properties
  for update using (
    public.is_staff()
    or landlord_id = public.app_landlord_id()
  )
  with check (
    public.is_staff()
    or landlord_id = public.app_landlord_id()
  );
create policy properties_delete on public.properties
  for delete using (public.is_manager());

-- tenants
create policy tenants_select on public.tenants
  for select using (
    public.is_staff()
    or id = public.app_tenant_id()
    or public.can_see_property(property_id)
  );
create policy tenants_insert on public.tenants
  for insert with check (
    public.is_staff()
    or exists (
      select 1 from public.properties p
      where p.id = property_id
        and p.landlord_id = public.app_landlord_id()
    )
  );
create policy tenants_update on public.tenants
  for update using (public.is_staff())
  with check (public.is_staff());
create policy tenants_delete on public.tenants
  for delete using (public.is_manager());

-- leases
create policy leases_select on public.leases
  for select using (
    public.is_staff()
    or landlord_id = public.app_landlord_id()
    or tenant_id = public.app_tenant_id()
  );
create policy leases_insert on public.leases
  for insert with check (
    public.is_staff()
    or landlord_id = public.app_landlord_id()
  );
create policy leases_update on public.leases
  for update using (public.is_staff())
  with check (public.is_staff());
create policy leases_delete on public.leases
  for delete using (public.is_staff());

-- payments
create policy payments_select on public.payments
  for select using (public.can_see_lease(lease_id));
create policy payments_insert on public.payments
  for insert with check (public.is_staff());
create policy payments_update on public.payments
  for update using (public.is_staff() or public.can_see_lease(lease_id))
  with check (public.is_staff() or public.can_see_lease(lease_id));
create policy payments_delete on public.payments
  for delete using (public.is_staff());

-- expenses
create policy expenses_select on public.expenses
  for select using (public.is_staff() or landlord_id = public.app_landlord_id());
create policy expenses_write on public.expenses
  for all using (public.is_staff() or landlord_id = public.app_landlord_id())
  with check (public.is_staff() or landlord_id = public.app_landlord_id());

-- tickets
create policy tickets_select on public.tickets
  for select using (public.can_see_property(property_id));
create policy tickets_insert on public.tickets
  for insert with check (public.can_see_property(property_id));
create policy tickets_update on public.tickets
  for update using (public.can_see_property(property_id))
  with check (public.can_see_property(property_id));
create policy tickets_delete on public.tickets
  for delete using (public.is_staff());

-- documents
create policy documents_select on public.documents
  for select using (
    public.is_staff()
    or public.can_see_property(property_id)
    or landlord_id = public.app_landlord_id()
    or tenant_id = public.app_tenant_id()
    or owner_user_id = public.app_user_id()
  );
create policy documents_insert on public.documents
  for insert with check (
    public.is_staff()
    or public.can_see_property(property_id)
    or landlord_id = public.app_landlord_id()
    or tenant_id = public.app_tenant_id()
  );
create policy documents_update on public.documents
  for update using (
    public.is_staff()
    or owner_user_id = public.app_user_id()
    or public.can_see_property(property_id)
  )
  with check (
    public.is_staff()
    or owner_user_id = public.app_user_id()
    or public.can_see_property(property_id)
  );
create policy documents_delete on public.documents
  for delete using (public.is_staff());

-- notifications
create policy notifications_select on public.notifications
  for select using (
    public.is_staff()
    or for_user_id = public.app_user_id()
    or for_role = public.app_role()
  );
create policy notifications_insert on public.notifications
  for insert with check (auth.uid() is not null);
create policy notifications_update on public.notifications
  for update using (
    public.is_staff()
    or for_user_id = public.app_user_id()
    or for_role = public.app_role()
  )
  with check (
    public.is_staff()
    or for_user_id = public.app_user_id()
    or for_role = public.app_role()
  );
create policy notifications_delete on public.notifications
  for delete using (public.is_staff());

-- professionals: readable directory, manager-only roster edits
create policy professionals_select on public.professionals
  for select using (auth.uid() is not null);
create policy professionals_write on public.professionals
  for all using (public.is_manager())
  with check (public.is_manager());

-- tasks: staff only
create policy tasks_staff on public.tasks
  for all using (public.is_staff())
  with check (public.is_staff());

-- chat
create policy chat_threads_select on public.chat_threads
  for select using (
    public.is_staff()
    or public.app_user_id() = any (participant_ids)
  );
create policy chat_threads_write on public.chat_threads
  for all using (
    public.is_staff()
    or public.app_user_id() = any (participant_ids)
  )
  with check (
    public.is_staff()
    or public.app_user_id() = any (participant_ids)
  );

create policy chat_messages_select on public.chat_messages
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
        and public.app_user_id() = any (t.participant_ids)
    )
  );
create policy chat_messages_insert on public.chat_messages
  for insert with check (
    from_user_id = public.app_user_id()
    and from_role = public.app_role()
    and (
      public.is_staff()
      or exists (
        select 1 from public.chat_threads t
        where t.id = thread_id
          and public.app_user_id() = any (t.participant_ids)
      )
    )
  );
create policy chat_messages_update on public.chat_messages
  for update using (public.is_staff())
  with check (public.is_staff());
create policy chat_messages_delete on public.chat_messages
  for delete using (public.is_staff());

-- onboardings
create policy onboardings_select on public.onboardings
  for select using (
    public.is_staff()
    or tenant_id = public.app_tenant_id()
    or exists (
      select 1 from public.tenants t
      where t.id = tenant_id
        and public.can_see_property(t.property_id)
    )
  );
create policy onboardings_write on public.onboardings
  for all using (
    public.is_staff()
    or tenant_id = public.app_tenant_id()
    or exists (
      select 1 from public.tenants t
      join public.properties p on p.id = t.property_id
      where t.id = tenant_id
        and p.landlord_id = public.app_landlord_id()
    )
  )
  with check (
    public.is_staff()
    or tenant_id = public.app_tenant_id()
    or exists (
      select 1 from public.tenants t
      join public.properties p on p.id = t.property_id
      where t.id = tenant_id
        and p.landlord_id = public.app_landlord_id()
    )
  );

-- protocols
create policy protocols_select on public.protocols
  for select using (public.can_see_property(property_id));
create policy protocols_write on public.protocols
  for all using (public.is_staff())
  with check (public.is_staff());

-- activity log: managers read; staff write
create policy activity_log_select on public.activity_log
  for select using (public.is_manager());
create policy activity_log_insert on public.activity_log
  for insert with check (
    public.is_staff()
    or user_id = public.app_user_id()
  );
create policy activity_log_update on public.activity_log
  for update using (public.is_manager())
  with check (public.is_manager());
create policy activity_log_delete on public.activity_log
  for delete using (public.is_manager());

-- withdrawals
create policy withdrawals_select on public.withdrawal_requests
  for select using (public.is_staff() or landlord_id = public.app_landlord_id());
create policy withdrawals_insert on public.withdrawal_requests
  for insert with check (
    public.is_staff()
    or (
      landlord_id = public.app_landlord_id()
      and created_by_user_id = public.app_user_id()
    )
  );
create policy withdrawals_update on public.withdrawal_requests
  for update using (public.is_staff())
  with check (public.is_staff());
create policy withdrawals_delete on public.withdrawal_requests
  for delete using (public.is_staff());

-- ---------- private storage ----------

update storage.buckets
set public = false
where id = 'uploads';

drop policy if exists uploads_select on storage.objects;
drop policy if exists uploads_insert on storage.objects;
drop policy if exists uploads_update on storage.objects;
drop policy if exists uploads_delete on storage.objects;

create policy uploads_select on storage.objects
  for select using (bucket_id = 'uploads' and auth.role() = 'authenticated');
create policy uploads_insert on storage.objects
  for insert with check (bucket_id = 'uploads' and auth.role() = 'authenticated');
create policy uploads_update on storage.objects
  for update using (bucket_id = 'uploads' and auth.role() = 'authenticated');
create policy uploads_delete on storage.objects
  for delete using (bucket_id = 'uploads' and auth.role() = 'authenticated');
