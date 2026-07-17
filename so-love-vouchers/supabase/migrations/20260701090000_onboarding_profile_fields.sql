-- Onboarding: capture SLK code + richer business contact info, and track
-- whether a member has completed the 2-step onboarding wizard.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slk_code TEXT,
  ADD COLUMN IF NOT EXISTS work_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_email TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Admins are exempt from the member onboarding wizard: mark them complete so
-- the app gate never routes staff through it (and can't lock the portal
-- behind a wizard bug).
UPDATE public.profiles
   SET onboarding_completed_at = now()
 WHERE onboarding_completed_at IS NULL
   AND id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');
