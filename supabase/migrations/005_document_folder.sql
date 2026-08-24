-- Vault folder for documents (property → tenant → category).
alter table public.documents
  add column if not exists folder text;
