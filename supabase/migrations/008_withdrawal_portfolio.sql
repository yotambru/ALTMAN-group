-- Portfolio withdrawals: a landlord can draw from total rent across all properties.
alter table public.withdrawal_requests
  alter column property_id drop not null;
