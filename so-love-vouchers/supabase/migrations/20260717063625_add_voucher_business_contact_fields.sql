alter table public.vouchers
  add column if not exists business_phone text,
  add column if not exists business_address text;
