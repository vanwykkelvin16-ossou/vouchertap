
-- ===== ROLES =====
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

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

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
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

-- Auto-create profile + default member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

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

CREATE POLICY "Users view own claims" ON public.voucher_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own claims" ON public.voucher_claims
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Allow user to mark their own claim redeemed (once); guarded by SQL function below
CREATE POLICY "Users update own claims" ON public.voucher_claims
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Server-side atomic redeem function
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

-- Atomic claim function (sets expires_at based on voucher.claim_window_hours)
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
