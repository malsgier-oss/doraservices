-- Dora: Hub Announcements (under search)
-- Admin-controlled announcements (city-specific or global)

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  city_id uuid NULL REFERENCES public.cities(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  start_at timestamptz NULL,
  end_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger (reuse if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    -- ok
  ELSE
    -- minimal fallback trigger function if not present
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END$$;

DROP TRIGGER IF EXISTS set_announcements_updated_at ON public.announcements;
CREATE TRIGGER set_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Public can read only active announcements within time window
DROP POLICY IF EXISTS "Public can read active announcements" ON public.announcements;
CREATE POLICY "Public can read active announcements" ON public.announcements
FOR SELECT
USING (
  is_active = true
  AND (start_at IS NULL OR start_at <= now())
  AND (end_at IS NULL OR end_at >= now())
);

-- Admins can manage announcements
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
