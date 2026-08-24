-- Uploaded property photos (public Storage URLs after hydrate).
alter table public.properties
  add column if not exists photo_urls text[] not null default '{}';
