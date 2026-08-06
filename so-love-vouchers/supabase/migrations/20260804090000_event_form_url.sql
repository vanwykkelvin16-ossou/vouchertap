-- Optional external form (e.g. Jotform) link per event.
-- When set, the app shows a "Register" button on the event card.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS form_url TEXT;
