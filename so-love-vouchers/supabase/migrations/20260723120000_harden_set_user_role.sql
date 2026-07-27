-- Harden admin promote/demote: block self-demote and last-admin lockout.
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user';
  END IF;

  -- Keep at least one admin; never let an admin strip their own admin role.
  IF _role = 'admin' AND NOT _grant THEN
    IF _user_id = auth.uid() THEN
      RAISE EXCEPTION 'cannot_demote_self';
    END IF;
    IF (
      SELECT count(*)::int
      FROM public.user_roles
      WHERE role = 'admin'
    ) <= 1 THEN
      RAISE EXCEPTION 'cannot_demote_last_admin';
    END IF;
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _role)
    ON CONFLICT DO NOTHING;
    -- Promoted admins remain members of the app.
    IF _role = 'admin' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (_user_id, 'member')
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role = _role;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role, boolean) TO authenticated, service_role;
