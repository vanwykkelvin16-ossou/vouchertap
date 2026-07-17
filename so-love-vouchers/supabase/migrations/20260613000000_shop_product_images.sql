-- Up to 3 product photos per item; first image is the cover
ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';

-- Backfill existing single images
UPDATE public.shop_products
SET images = ARRAY[image_url]
WHERE image_url IS NOT NULL AND (images IS NULL OR images = '{}');
