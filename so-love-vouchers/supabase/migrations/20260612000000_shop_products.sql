-- SLK Shop: merch products (golfers, caps, hoodies, ...)
CREATE TABLE public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',     -- golfer | cap | hoodie | other
  price NUMERIC(10,2) NOT NULL DEFAULT 0,     -- ZAR
  image_url TEXT,
  colors TEXT[] NOT NULL DEFAULT '{}',
  sizes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

-- Members see active products; admins see everything
CREATE POLICY "Members view active products" ON public.shop_products
  FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert products" ON public.shop_products
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update products" ON public.shop_products
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete products" ON public.shop_products
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Live updates in the member app when admin edits the shop
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_products;

CREATE INDEX shop_products_active_sort_idx
  ON public.shop_products (is_active, sort_order, created_at DESC);
