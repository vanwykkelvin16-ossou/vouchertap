
CREATE TABLE public.breakfast_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date timestamptz NOT NULL,
  speaker_name text,
  speaker_title text,
  speaker_bio text,
  speaker_image_url text,
  topic text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.breakfast_meetings TO authenticated;
GRANT ALL ON public.breakfast_meetings TO service_role;

ALTER TABLE public.breakfast_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published meetings"
ON public.breakfast_meetings FOR SELECT TO authenticated
USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage breakfast meetings"
ON public.breakfast_meetings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_breakfast_meetings_date ON public.breakfast_meetings(meeting_date);
