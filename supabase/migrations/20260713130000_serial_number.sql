-- Add serial_number to products (unique identifier per unit)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS serial_number TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_products_serial_number
  ON public.products (serial_number);
