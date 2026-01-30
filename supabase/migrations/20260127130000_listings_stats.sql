-- Add stats columns to personal listings (buy & sell)
-- These track views, calls, and WhatsApp clicks per listing

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS call_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.listings.views_count IS 'Number of times this listing was viewed';
COMMENT ON COLUMN public.listings.call_count IS 'Number of call button clicks';
COMMENT ON COLUMN public.listings.whatsapp_count IS 'Number of WhatsApp button clicks';
