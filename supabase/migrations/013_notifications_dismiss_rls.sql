-- Allow recipients (not only staff) to dismiss their own notifications.
-- Previously only is_staff() could DELETE, so "נקה הכל" failed for landlord/tenant.

drop policy if exists notifications_update on public.notifications;
drop policy if exists notifications_delete on public.notifications;

create policy notifications_update on public.notifications
  for update using (
    public.is_staff()
    or for_user_id = public.app_user_id()
    or for_role = public.app_role()
    or (for_user_id is null and for_role is null)
  )
  with check (
    public.is_staff()
    or for_user_id = public.app_user_id()
    or for_role = public.app_role()
    or (for_user_id is null and for_role is null)
  );

create policy notifications_delete on public.notifications
  for delete using (
    public.is_staff()
    or for_user_id = public.app_user_id()
    or for_role = public.app_role()
    or (for_user_id is null and for_role is null)
  );
