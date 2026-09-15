-- Login accounts must belong to a real landlord/tenant row.
-- Stops the half-created state where an email is taken but nobody can sign in.

delete from public.app_users u
where u.landlord_id is not null
  and not exists (select 1 from public.landlords l where l.id = u.landlord_id);

delete from public.app_users u
where u.tenant_id is not null
  and not exists (select 1 from public.tenants t where t.id = u.tenant_id);

do $$
begin
  alter table public.app_users
    add constraint app_users_landlord_id_fkey
    foreign key (landlord_id) references public.landlords (id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.app_users
    add constraint app_users_tenant_id_fkey
    foreign key (tenant_id) references public.tenants (id) on delete cascade;
exception
  when duplicate_object then null;
end $$;
