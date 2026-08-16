-- Login accounts opened by email set a password on first entry.
alter table public.app_users add column if not exists password_hash text;

create unique index if not exists app_users_email_lower
  on public.app_users (lower(email))
  where email is not null and email <> '';
