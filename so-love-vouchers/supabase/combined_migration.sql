-- =====================================================
-- SO LOVE KRUGERSDORP — Full Database Setup
-- Run this in the Supabase SQL Editor (once, on a fresh project)
-- =====================================================

-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== HELPER: has_role =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== AUTO-CREATE PROFILE ON SIGNUP =====
-- Admin email: change 'admin@gmail.com' to the actual SO Love Krugersdorp admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;

  -- Grant admin role automatically to the configured admin email
  IF lower(NEW.email) = 'admin@slkd.co.za' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== EVENTS =====
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events REPLICA IDENTITY FULL;

CREATE POLICY "Authenticated can view published events" ON public.events
  FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Admins manage events" ON public.events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== VOUCHERS =====
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  business_name TEXT,
  business_logo_url TEXT,
  value_text TEXT,
  terms TEXT,
  claim_window_hours INTEGER NOT NULL DEFAULT 48,
  available_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers REPLICA IDENTITY FULL;

CREATE POLICY "Authenticated can view active vouchers" ON public.vouchers
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage vouchers" ON public.vouchers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== VOUCHER CLAIMS =====
CREATE TABLE public.voucher_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  UNIQUE (voucher_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.voucher_claims TO authenticated;
GRANT ALL ON public.voucher_claims TO service_role;
ALTER TABLE public.voucher_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_claims REPLICA IDENTITY FULL;

CREATE POLICY "Users view own claims" ON public.voucher_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own claims" ON public.voucher_claims
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own claims" ON public.voucher_claims
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all claims" ON public.voucher_claims
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== CLAIM VOUCHER (atomic) =====
CREATE OR REPLACE FUNCTION public.claim_voucher(_voucher_id UUID)
RETURNS public.voucher_claims
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _v public.vouchers;
  _claim public.voucher_claims;
BEGIN
  SELECT * INTO _v FROM public.vouchers WHERE id = _voucher_id AND is_active = true;
  IF _v.id IS NULL THEN
    RAISE EXCEPTION 'voucher_not_available';
  END IF;
  IF _v.available_until IS NOT NULL AND _v.available_until < now() THEN
    RAISE EXCEPTION 'voucher_expired';
  END IF;

  INSERT INTO public.voucher_claims (voucher_id, user_id, expires_at)
  VALUES (_voucher_id, auth.uid(), now() + (_v.claim_window_hours || ' hours')::interval)
  RETURNING * INTO _claim;

  RETURN _claim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_voucher(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_voucher(UUID) FROM PUBLIC, anon;

-- ===== REDEEM VOUCHER (atomic) =====
CREATE OR REPLACE FUNCTION public.redeem_voucher_claim(_claim_id UUID)
RETURNS public.voucher_claims
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _claim public.voucher_claims;
BEGIN
  UPDATE public.voucher_claims
     SET redeemed_at = now()
   WHERE id = _claim_id
     AND user_id = auth.uid()
     AND redeemed_at IS NULL
     AND expires_at > now()
  RETURNING * INTO _claim;

  IF _claim.id IS NULL THEN
    RAISE EXCEPTION 'voucher_not_redeemable';
  END IF;

  RETURN _claim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_voucher_claim(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_voucher_claim(UUID) FROM PUBLIC, anon;

-- ===== SET USER ROLE (admin-only) =====
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role, _grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role, boolean) TO authenticated;

-- ===== SET MEMBER DISABLED (admin-only) =====
CREATE OR REPLACE FUNCTION public.set_member_disabled(_user_id uuid, _disabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.profiles SET disabled_at = CASE WHEN _disabled THEN now() ELSE NULL END
  WHERE id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_member_disabled(uuid, boolean) TO authenticated;

-- ===== ADMIN ROLES for existing users =====
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== BREAKFAST MEETINGS =====
CREATE TABLE public.breakfast_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date TIMESTAMPTZ NOT NULL,
  speaker_name TEXT,
  speaker_title TEXT,
  speaker_bio TEXT,
  speaker_image_url TEXT,
  topic TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.breakfast_meetings TO authenticated;
GRANT ALL ON public.breakfast_meetings TO service_role;
ALTER TABLE public.breakfast_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published meetings" ON public.breakfast_meetings
  FOR SELECT TO authenticated
  USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage breakfast meetings" ON public.breakfast_meetings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_breakfast_meetings_date ON public.breakfast_meetings(meeting_date);

-- ===== CONTACT INFO =====
CREATE TABLE public.contact_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  general_email TEXT,
  contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contact_info TO authenticated;
GRANT ALL ON public.contact_info TO service_role;
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contact info" ON public.contact_info
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert contact info" ON public.contact_info
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update contact info" ON public.contact_info
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete contact info" ON public.contact_info
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed contact info
INSERT INTO public.contact_info (general_email, contacts)
VALUES (
  'info@slkd.co.za',
  '[
    {"name":"Debbie Yeates","phone":"072 323 4300"},
    {"name":"Danie Steyn","phone":"063 903 6389"}
  ]'::jsonb
);

-- ===== PUSH SUBSCRIPTIONS =====
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  notify_vouchers boolean NOT NULL DEFAULT true,
  notify_events boolean NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own push subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own push subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own push subscriptions" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own push subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- ===== STORAGE BUCKET: media =====
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Admins insert media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

-- ===== REALTIME =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'events') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.events';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'vouchers') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.vouchers';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'voucher_claims') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.voucher_claims';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contact_info') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_info';
  END IF;
END $$;
