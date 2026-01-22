-- Personal listings (normal users marketplace)
-- Allows authenticated users to publish items for sale, separate from business deals.

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  price numeric,
  currency text NOT NULL DEFAULT 'LYD',
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  location text,
  image_urls text[],
  status text NOT NULL DEFAULT 'active',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listings_status_check CHECK (status = ANY (ARRAY['draft','active','sold','archived']))
);

CREATE INDEX IF NOT EXISTS listings_city_id_idx ON public.listings (city_id);
CREATE INDEX IF NOT EXISTS listings_category_idx ON public.listings (category);
CREATE INDEX IF NOT EXISTS listings_status_idx ON public.listings (status);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON public.listings (created_at DESC);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Listings are viewable by everyone'
  ) THEN
    CREATE POLICY "Listings are viewable by everyone"
      ON public.listings
      FOR SELECT
      USING (true);
  END IF;

  -- Authenticated create
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Users can create their own listings'
  ) THEN
    CREATE POLICY "Users can create their own listings"
      ON public.listings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Authenticated update own
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Users can update their own listings'
  ) THEN
    CREATE POLICY "Users can update their own listings"
      ON public.listings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Authenticated delete own
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Users can delete their own listings'
  ) THEN
    CREATE POLICY "Users can delete their own listings"
      ON public.listings
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Admins can update any
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Admins can update any listing'
  ) THEN
    CREATE POLICY "Admins can update any listing"
      ON public.listings
      FOR UPDATE
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Keep updated_at fresh (uses shared function in schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_listings_updated_at'
  ) THEN
    CREATE TRIGGER update_listings_updated_at
      BEFORE UPDATE ON public.listings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

