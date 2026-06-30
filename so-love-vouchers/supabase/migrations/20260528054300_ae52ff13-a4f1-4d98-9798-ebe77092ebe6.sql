
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS business_logo_url TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS public.contact_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  general_email TEXT,
  contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contact_info TO authenticated;
GRANT ALL ON public.contact_info TO service_role;

ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contact info"
  ON public.contact_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins insert contact info"
  ON public.contact_info FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update contact info"
  ON public.contact_info FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete contact info"
  ON public.contact_info FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.contact_info (general_email, contacts)
VALUES (
  'info@slkd.co.za',
  '[
    {"name":"Debbie Yeates","phone":"072 323 4300"},
    {"name":"Danie Steyn","phone":"063 903 6389"}
  ]'::jsonb
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_info;
