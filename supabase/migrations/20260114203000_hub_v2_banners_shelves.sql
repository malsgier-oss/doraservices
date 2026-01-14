-- Dora Hub v2: Admin-controlled banners + shelves (category + manual), with city targeting.
-- - Banner images are stored in Supabase Storage bucket: hub-banners
-- - Hub reads banners/shelves publicly (no login)
-- - Writes are restricted to admins (user_roles.role = 'admin')

-- 1) Storage bucket for hub banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('hub-banners', 'hub-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access to banner images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Hub banner images are publicly accessible'
  ) THEN
    CREATE POLICY "Hub banner images are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'hub-banners');
  END IF;
END $$;

-- Admin-only write access (insert/update/delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can manage hub banner images'
  ) THEN
    CREATE POLICY "Admins can manage hub banner images"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (
      bucket_id = 'hub-banners' AND
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'
      )
    )
    WITH CHECK (
      bucket_id = 'hub-banners' AND
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'
      )
    );
  END IF;
END $$;

-- 2) Tables: hub_banners, hub_shelves, hub_shelf_items

-- Banner target types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hub_banner_target_type') THEN
    CREATE TYPE public.hub_banner_target_type AS ENUM ('category', 'url');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.hub_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  subtitle_ar text NULL,
  cta_text_ar text NULL,
  image_path text NOT NULL, -- e.g. 'banners/<uuid>.jpg' inside bucket hub-banners
  target_type public.hub_banner_target_type NOT NULL DEFAULT 'category',
  target_category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  target_url text NULL,
  city_id uuid NULL REFERENCES public.cities(id) ON DELETE SET NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  start_at timestamptz NULL,
  end_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_banners_active_order
  ON public.hub_banners (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_hub_banners_city
  ON public.hub_banners (city_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hub_shelf_type') THEN
    CREATE TYPE public.hub_shelf_type AS ENUM ('category', 'manual');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.hub_shelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  shelf_type public.hub_shelf_type NOT NULL DEFAULT 'category',
  -- For category shelves
  category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  -- City targeting (NULL = all)
  city_id uuid NULL REFERENCES public.cities(id) ON DELETE SET NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  max_items int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_shelves_active_order
  ON public.hub_shelves (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_hub_shelves_city
  ON public.hub_shelves (city_id);

-- Manual shelf items: categories to show in that shelf.
CREATE TABLE IF NOT EXISTS public.hub_shelf_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id uuid NOT NULL REFERENCES public.hub_shelves(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shelf_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_shelf_items_shelf_order
  ON public.hub_shelf_items (shelf_id, display_order);

-- updated_at triggers (reuse existing function if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    -- attach triggers
    DROP TRIGGER IF EXISTS trg_hub_banners_updated_at ON public.hub_banners;
    CREATE TRIGGER trg_hub_banners_updated_at
      BEFORE UPDATE ON public.hub_banners
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS trg_hub_shelves_updated_at ON public.hub_shelves;
    CREATE TRIGGER trg_hub_shelves_updated_at
      BEFORE UPDATE ON public.hub_shelves
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) RLS
ALTER TABLE public.hub_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_shelf_items ENABLE ROW LEVEL SECURITY;

-- Public read (Hub needs it); filtering by city/date is handled in queries.
DO $$
BEGIN
  -- hub_banners public select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hub_banners'
      AND policyname = 'Public can read active hub banners'
  ) THEN
    CREATE POLICY "Public can read active hub banners"
    ON public.hub_banners
    FOR SELECT
    USING (is_active = true);
  END IF;

  -- hub_shelves public select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hub_shelves'
      AND policyname = 'Public can read active hub shelves'
  ) THEN
    CREATE POLICY "Public can read active hub shelves"
    ON public.hub_shelves
    FOR SELECT
    USING (is_active = true);
  END IF;

  -- hub_shelf_items public select (only for active shelves)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hub_shelf_items'
      AND policyname = 'Public can read hub shelf items'
  ) THEN
    CREATE POLICY "Public can read hub shelf items"
    ON public.hub_shelf_items
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.hub_shelves s
        WHERE s.id = hub_shelf_items.shelf_id
          AND s.is_active = true
      )
    );
  END IF;

  -- Admin full access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hub_banners'
      AND policyname = 'Admins can manage hub banners'
  ) THEN
    CREATE POLICY "Admins can manage hub banners"
    ON public.hub_banners
    FOR ALL
    TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hub_shelves'
      AND policyname = 'Admins can manage hub shelves'
  ) THEN
    CREATE POLICY "Admins can manage hub shelves"
    ON public.hub_shelves
    FOR ALL
    TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hub_shelf_items'
      AND policyname = 'Admins can manage hub shelf items'
  ) THEN
    CREATE POLICY "Admins can manage hub shelf items"
    ON public.hub_shelf_items
    FOR ALL
    TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    );
  END IF;
END $$;
