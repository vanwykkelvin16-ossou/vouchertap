ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.shop_products SET images = ARRAY[image_url] WHERE image_url IS NOT NULL AND (images IS NULL OR array_length(images,1) IS NULL);