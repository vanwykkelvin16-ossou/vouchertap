-- Business contact details shown to the customer once they claim a voucher:
-- where to redeem it (address) and who to reach (phone).
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS business_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT;
