ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slk_code TEXT,
  ADD COLUMN IF NOT EXISTS work_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_email TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

UPDATE public.profiles
   SET onboarding_completed_at = now()
 WHERE onboarding_completed_at IS NULL
   AND id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');