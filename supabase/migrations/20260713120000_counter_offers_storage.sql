-- ============================================================
-- 1. Storage: product-images bucket (public)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit;

-- Drop existing storage policies if any (safe re-run)
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete product images" ON storage.objects;

CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');

-- ============================================================
-- 2. Add quantity to reservations
-- ============================================================
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1);

-- ============================================================
-- 3. Counter offers table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.counter_offers (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid          NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name text          NOT NULL CHECK (char_length(customer_name) <= 120),
  customer_email text         NOT NULL CHECK (char_length(customer_email) <= 255),
  customer_phone text         NOT NULL CHECK (char_length(customer_phone) <= 40),
  counter_price  numeric(12,2) NOT NULL CHECK (counter_price > 0),
  notes         text          CHECK (char_length(notes) <= 1000),
  status        text          NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','accepted','outbid','withdrawn')),
  notified_at   timestamptz,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

GRANT INSERT ON public.counter_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counter_offers TO authenticated;
GRANT ALL ON public.counter_offers TO service_role;

ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY;

-- Anon/public can submit counter offers
DROP POLICY IF EXISTS "anon_insert_counter_offers" ON public.counter_offers;
CREATE POLICY "anon_insert_counter_offers"
  ON public.counter_offers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read / update counter offers
DROP POLICY IF EXISTS "admin_select_counter_offers" ON public.counter_offers;
CREATE POLICY "admin_select_counter_offers"
  ON public.counter_offers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_update_counter_offers" ON public.counter_offers;
CREATE POLICY "admin_update_counter_offers"
  ON public.counter_offers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
DROP TRIGGER IF EXISTS counter_offers_updated_at ON public.counter_offers;
CREATE TRIGGER counter_offers_updated_at
  BEFORE UPDATE ON public.counter_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
