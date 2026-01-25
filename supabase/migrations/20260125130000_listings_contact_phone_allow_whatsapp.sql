-- Listings: contact_phone (so buyers can call/WhatsApp without reading profiles) and allow_whatsapp toggle

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS allow_whatsapp boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.listings.contact_phone IS 'Seller contact phone for this listing; set from profile at create/update so anon buyers can call without profile RLS.';
COMMENT ON COLUMN public.listings.allow_whatsapp IS 'When false, hide WhatsApp button for this listing.';

-- Backfill contact_phone from profiles where possible
UPDATE public.listings l
SET contact_phone = (
  SELECT trim(leading '0' from regexp_replace(p.phone, '\D', '', 'g'))
  FROM public.profiles p
  WHERE p.user_id = l.user_id AND p.phone IS NOT NULL AND length(trim(p.phone)) > 0
  LIMIT 1
)
WHERE l.contact_phone IS NULL;
