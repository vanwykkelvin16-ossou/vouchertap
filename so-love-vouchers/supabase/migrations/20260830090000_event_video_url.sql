-- Optional video link per event (Google Drive, Facebook, YouTube, anything).
-- When set, the app shows a "Watch Video" button on the event card.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS video_url TEXT;
