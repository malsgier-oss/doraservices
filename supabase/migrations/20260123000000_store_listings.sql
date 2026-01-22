-- Store listings table for business stores
-- This is separate from personal listings (listings table)
-- Store listings belong to a business and are managed through the business dashboard

CREATE TABLE IF NOT EXISTS public.store_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  price numeric,
  currency text NOT NULL DEFAULT 'LYD',
  image_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  views_count integer NOT NULL DEFAULT 0,
  calls_count integer NOT NULL DEFAULT 0,
  whatsapp_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT store_listings_status_check CHECK (status = ANY (ARRAY['draft','active','paused','archived']))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS store_listings_business_id_idx ON public.store_listings (business_id);
CREATE INDEX IF NOT EXISTS store_listings_status_idx ON public.store_listings (status);
CREATE INDEX IF NOT EXISTS store_listings_created_at_idx ON public.store_listings (created_at DESC);
CREATE INDEX IF NOT EXISTS store_listings_user_id_idx ON public.store_listings (user_id);

-- Enable RLS
ALTER TABLE public.store_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public read for active listings
CREATE POLICY "Store listings are viewable by everyone (active only)"
  ON public.store_listings
  FOR SELECT
  USING (status = 'active' AND archived_at IS NULL);

-- Business owners can view all their own listings (any status)
CREATE POLICY "Business owners can view their own listings"
  ON public.store_listings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Business owners can create listings
CREATE POLICY "Business owners can create their own listings"
  ON public.store_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Business owners can update their own listings
CREATE POLICY "Business owners can update their own listings"
  ON public.store_listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Business owners can delete their own listings (soft delete via archived_at)
CREATE POLICY "Business owners can delete their own listings"
  ON public.store_listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all listings
CREATE POLICY "Admins can manage all store listings"
  ON public.store_listings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_store_listings_updated_at
  BEFORE UPDATE ON public.store_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
