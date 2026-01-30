-- Add optional subcategory to personal listings (buy & sell).
-- When set, filters use category + subcategory (e.g. Electronics → Phones).

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS subcategory text;

CREATE INDEX IF NOT EXISTS listings_subcategory_idx ON public.listings (subcategory)
  WHERE subcategory IS NOT NULL;

COMMENT ON COLUMN public.listings.subcategory IS 'Optional subcategory within category (e.g. phones, laptops under electronics).';
