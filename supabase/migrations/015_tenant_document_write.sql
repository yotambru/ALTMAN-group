-- Tenants must be able to keep their own uploads after insert (retry / upsert).
-- activity_log rows are written by the acting user; they cannot be manager-updated only.

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update using (
    public.is_staff()
    or owner_user_id = public.app_user_id()
    or tenant_id = public.app_tenant_id()
    or public.can_see_property(property_id)
  )
  with check (
    public.is_staff()
    or owner_user_id = public.app_user_id()
    or tenant_id = public.app_tenant_id()
    or public.can_see_property(property_id)
  );

drop policy if exists activity_log_update on public.activity_log;
create policy activity_log_update on public.activity_log
  for update using (
    public.is_manager()
    or user_id = public.app_user_id()
  )
  with check (
    public.is_manager()
    or user_id = public.app_user_id()
  );
