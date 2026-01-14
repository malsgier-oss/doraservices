-- Dora Hub v3: image-only banners (no URL), chips, Top-8 categories (global + city override), and featured services.

-- 1) Extend hub banner target enum + columns
DO $$
BEGIN
  -- Enum created in 20260114203000_hub_v2_banners_shelves.sql
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hub_banner_target_type') THEN
    -- Add values if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'hub_banner_target_type' AND e.enumlabel = 'none'
    ) THEN
      ALTER TYPE public.hub_banner_target_type ADD VALUE 'none' BEFORE 'category';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'hub_banner_target_type' AND e.enumlabel = 'subcategory'
    ) THEN
      ALTER TYPE public.hub_banner_target_type ADD VALUE 'subcategory';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'hub_banner_target_type' AND e.enumlabel = 'shelf'
    ) THEN
      ALTER TYPE public.hub_banner_target_type ADD VALUE 'shelf';
    END IF;
  END IF;
END $$;

-- Make banner title optional (hub renders image-only)
ALTER TABLE public.hub_banners
  ALTER COLUMN title_ar DROP NOT NULL;

-- New targets
ALTER TABLE public.hub_banners
  ADD COLUMN IF NOT EXISTS target_subcategory_id uuid NULL REFERENCES public.subcategories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_shelf_id text NULL;

-- 2) Chips table (scrollable chips under search)
CREATE TABLE IF NOT EXISTS public.hub_chips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_ar text NULL,
  label_en text NULL,
  target_type text NOT NULL CHECK (target_type IN ('category','subcategory','shelf')),
  target_category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  target_subcategory_id uuid NULL REFERENCES public.subcategories(id) ON DELETE SET NULL,
  target_shelf_id text NULL,
  city_id uuid NULL REFERENCES public.cities(id) ON DELETE SET NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_chips_active_order
  ON public.hub_chips (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_hub_chips_city
  ON public.hub_chips (city_id);

-- 3) Top-8 categories mapping (global + city override)
CREATE TABLE IF NOT EXISTS public.hub_top_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global','city')),
  city_id uuid NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, city_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_top_categories_scope_city
  ON public.hub_top_categories (scope, city_id);

CREATE INDEX IF NOT EXISTS idx_hub_top_categories_active_order
  ON public.hub_top_categories (is_active, display_order);

-- 4) Featured services flags on subcategories
ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_order int NULL;

-- 5) updated_at triggers (reuse existing function if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trg_hub_chips_updated_at ON public.hub_chips;
    CREATE TRIGGER trg_hub_chips_updated_at
      BEFORE UPDATE ON public.hub_chips
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS trg_hub_top_categories_updated_at ON public.hub_top_categories;
    CREATE TRIGGER trg_hub_top_categories_updated_at
      BEFORE UPDATE ON public.hub_top_categories
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 6) RLS
ALTER TABLE public.hub_chips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_top_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hub_chips'
      AND policyname = 'Public can read active hub chips'
  ) THEN
    CREATE POLICY "Public can read active hub chips"
    ON public.hub_chips
    FOR SELECT
    USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hub_top_categories'
      AND policyname = 'Public can read active hub top categories'
  ) THEN
    CREATE POLICY "Public can read active hub top categories"
    ON public.hub_top_categories
    FOR SELECT
    USING (is_active = true);
  END IF;

  -- Admin manage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hub_chips'
      AND policyname = 'Admins can manage hub chips'
  ) THEN
    CREATE POLICY "Admins can manage hub chips"
    ON public.hub_chips
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
    WHERE schemaname = 'public' AND tablename = 'hub_top_categories'
      AND policyname = 'Admins can manage hub top categories'
  ) THEN
    CREATE POLICY "Admins can manage hub top categories"
    ON public.hub_top_categories
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

-- 7) Ensure site pages exist (minimal placeholders)
INSERT INTO public.site_pages (slug, title_ar, title_en, content_ar, content_en, is_published)
VALUES
  ('help', 'مركز المساعدة', 'Help Center', 'محتوى مبدئي لمركز المساعدة.', 'Initial help center content.', true),
  ('become-provider', 'انضم كمزود خدمة', 'Become a Provider', 'محتوى مبدئي لصفحة الانضمام كمزود خدمة.', 'Initial provider onboarding content.', true)
ON CONFLICT (slug) DO NOTHING;
