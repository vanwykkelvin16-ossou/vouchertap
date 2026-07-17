-- Run once in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zgaerghmlkikldbmsbwq/sql/new
--
-- Resets accounts to:
--   admin@slkd.co.za  (admin portal only)
--   demo@gmail.com    (member demo account)

-- 1) Update signup trigger: only admin@slkd.co.za gets admin role
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

-- 2) Remove all users except admin + demo (and their related data)
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

-- 3) Ensure admin role only on admin@slkd.co.za
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE lower(email) = 'admin@slkd.co.za'
  );

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE lower(email) = 'admin@slkd.co.za'
ON CONFLICT DO NOTHING;

-- 4) Ensure demo is member only (not admin)
DELETE FROM public.user_roles
WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'demo@gmail.com')
  AND role = 'admin';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'member'::app_role
FROM auth.users
WHERE lower(email) = 'demo@gmail.com'
ON CONFLICT DO NOTHING;

-- 5) Set passwords (bcrypt via pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE auth.users
SET encrypted_password = crypt('Slkd@Admin2026!Xk9m', gen_salt('bf'))
WHERE lower(email) = 'admin@slkd.co.za';

UPDATE auth.users
SET encrypted_password = crypt('1234567', gen_salt('bf'))
WHERE lower(email) = 'demo@gmail.com';
