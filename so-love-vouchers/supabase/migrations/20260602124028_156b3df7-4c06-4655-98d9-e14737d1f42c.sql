
-- 1) Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_voucher(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_voucher_claim(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_member_disabled(uuid, boolean) FROM PUBLIC, anon;

-- 2) Restrict broad SELECT on media storage bucket (public URLs still work; this only limits API listing/access)
DROP POLICY IF EXISTS "Public read media" ON storage.objects;
CREATE POLICY "Admins read media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
