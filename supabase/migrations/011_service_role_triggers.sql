-- Allow the seed / service_role key to link Auth users.
-- Run this once in the SQL editor, then: npm run seed

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
