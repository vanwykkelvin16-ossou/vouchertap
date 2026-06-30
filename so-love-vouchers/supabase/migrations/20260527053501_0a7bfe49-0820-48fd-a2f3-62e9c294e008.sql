
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_voucher(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_voucher_claim(UUID) FROM PUBLIC, anon;
