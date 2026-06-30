-- Reset admin account to admin@slkd.co.za only
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;

  IF lower(NEW.email) = 'admin@slkd.co.za' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Grant admin role to the new admin account
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE lower(email) = 'admin@slkd.co.za'
ON CONFLICT DO NOTHING;

-- Remove admin role from all other accounts
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE lower(email) = 'admin@slkd.co.za'
  );

-- Delete all users except admin and demo
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN
    SELECT id FROM auth.users
    WHERE lower(email) NOT IN ('admin@slkd.co.za', 'demo@gmail.com')
  LOOP
    DELETE FROM public.voucher_claims WHERE user_id = u.id;
    DELETE FROM public.push_subscriptions WHERE user_id = u.id;
    DELETE FROM public.user_roles WHERE user_id = u.id;
    DELETE FROM public.profiles WHERE id = u.id;
    DELETE FROM auth.users WHERE id = u.id;
  END LOOP;
END $$;
