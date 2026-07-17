-- SECURITY FIX (flagged by scan):
-- Members could INSERT/UPDATE voucher_claims directly, bypassing claim_voucher /
-- redeem_voucher_claim business logic (e.g. forging expires_at, faking cycle_key
-- to dodge the monthly limit, or un-redeeming a used voucher).
--
-- All legitimate writes go through the SECURITY DEFINER RPCs, which run as the
-- function owner and do not depend on these grants/policies. App code only ever
-- SELECTs from this table directly, so nothing breaks.

DROP POLICY IF EXISTS "Users create own claims" ON public.voucher_claims;
DROP POLICY IF EXISTS "Users update own claims" ON public.voucher_claims;

REVOKE INSERT, UPDATE, DELETE ON public.voucher_claims FROM authenticated;

-- Keep read access:
--   "Users view own claims"  (SELECT, own rows)
--   "Admins view all claims" (SELECT, admins)
-- service_role retains full access for server functions.
