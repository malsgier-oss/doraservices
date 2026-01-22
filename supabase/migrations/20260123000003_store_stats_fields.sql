-- Add stats fields to businesses table (Phase 4)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS total_views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_calls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_whatsapp integer NOT NULL DEFAULT 0;
