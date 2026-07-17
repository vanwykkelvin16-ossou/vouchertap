-- Admin-gated member deletion as a SECURITY DEFINER function, mirroring
-- set_member_disabled / set_user_role. Lets the admin's own session delete a
-- member without the app server needing the service-role key.
--
-- Robust in two modes: it always wipes the member's app data, then attempts
-- to remove the auth login + profile row entirely. If deleting from
-- auth.users is not permitted in this environment, it falls back to leaving
-- a permanently-disabled, anonymised tombstone profile so the login is dead
-- either way.
CREATE OR REPLACE FUNCTION public.delete_member(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_delete_self';
  END IF;

  DELETE FROM public.voucher_claims WHERE user_id = _user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;

  -- Anonymise + disable first so the account is dead even if the auth
  -- delete below is not permitted.
  UPDATE public.profiles
     SET disabled_at = now(),
         display_name = 'Deleted member',
         first_name = NULL, last_name = NULL, slk_code = NULL,
         phone = NULL, work_phone = NULL, avatar_url = NULL,
         business_name = NULL, business_email = NULL,
         business_website = NULL, business_logo_url = NULL
   WHERE id = _user_id;

  BEGIN
    DELETE FROM auth.users WHERE id = _user_id;
    DELETE FROM public.profiles WHERE id = _user_id;
  EXCEPTION WHEN OTHERS THEN
    -- auth delete not permitted here: the disabled tombstone above stands.
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_member(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_member(uuid) FROM PUBLIC, anon;
