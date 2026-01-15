-- Dora: Reviews Option A (locked)
--
-- Goals:
-- 1) Allow ratings to be submitted after Call/WhatsApp even without signup (anonymous).
-- 2) Keep review text private (admin-only). Public UI should rely on aggregated stats.
-- 3) Re-enable Admin Reviews page.

-- 1) service_reviews: allow anonymous via reviewer_key, keep authenticated via user_id
ALTER TABLE public.service_reviews
  ADD COLUMN IF NOT EXISTS reviewer_key TEXT;

ALTER TABLE public.service_reviews
  ALTER COLUMN user_id DROP NOT NULL;

-- Drop old unique constraint (service_id, user_id) and replace with partial unique indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_reviews_service_id_user_id_key'
  ) THEN
    ALTER TABLE public.service_reviews DROP CONSTRAINT service_reviews_service_id_user_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS service_reviews_unique_auth_user
  ON public.service_reviews(service_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS service_reviews_unique_anon_reviewer
  ON public.service_reviews(service_id, reviewer_key)
  WHERE reviewer_key IS NOT NULL;

-- Basic integrity: must have either user_id or reviewer_key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_reviews_user_or_reviewer_check'
  ) THEN
    ALTER TABLE public.service_reviews
      ADD CONSTRAINT service_reviews_user_or_reviewer_check
      CHECK (user_id IS NOT NULL OR reviewer_key IS NOT NULL);
  END IF;
END $$;

-- 2) Aggregated stats table (publicly readable)
CREATE TABLE IF NOT EXISTS public.service_review_stats (
  service_id UUID PRIMARY KEY REFERENCES public.services(id) ON DELETE CASCADE,
  average_rating NUMERIC NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_review_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read service review stats" ON public.service_review_stats;
CREATE POLICY "Public can read service review stats"
  ON public.service_review_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Internal update helper: recompute stats for a given service_id
CREATE OR REPLACE FUNCTION public.recompute_service_review_stats(p_service_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg NUMERIC;
  v_cnt INTEGER;
BEGIN
  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
    COALESCE(COUNT(*), 0)
  INTO v_avg, v_cnt
  FROM public.service_reviews
  WHERE service_id = p_service_id
    AND COALESCE(admin_hidden, false) = false;

  INSERT INTO public.service_review_stats(service_id, average_rating, total_reviews, updated_at)
  VALUES (p_service_id, v_avg, v_cnt, now())
  ON CONFLICT (service_id)
  DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_reviews = EXCLUDED.total_reviews,
    updated_at = now();
END;
$$;

-- Trigger: keep stats in sync
CREATE OR REPLACE FUNCTION public.handle_service_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_service_review_stats(OLD.service_id);
  ELSE
    PERFORM public.recompute_service_review_stats(NEW.service_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_service_review_change ON public.service_reviews;
CREATE TRIGGER on_service_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.service_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_service_review_change();

-- Backfill stats for existing services
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT service_id FROM public.service_reviews LOOP
    PERFORM public.recompute_service_review_stats(r.service_id);
  END LOOP;
END $$;

-- 3) RLS policies for service_reviews
-- Remove public read; review text should be admin-only.
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.service_reviews;

-- Allow admin to read/moderate
DROP POLICY IF EXISTS "Admins can view reviews" ON public.service_reviews;
CREATE POLICY "Admins can view reviews"
  ON public.service_reviews
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Relax insert policies to support anonymous + authenticated
DROP POLICY IF EXISTS "Verified users can create reviews" ON public.service_reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.service_reviews;

CREATE POLICY "Authenticated users can create reviews"
  ON public.service_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anonymous users can create reviews"
  ON public.service_reviews
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND reviewer_key IS NOT NULL);

-- Users can update/delete their own reviews (authenticated)
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.service_reviews;
CREATE POLICY "Users can update their own reviews"
  ON public.service_reviews
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.service_reviews;
CREATE POLICY "Users can delete their own reviews"
  ON public.service_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admin moderation (already present in older migration, re-assert)
DROP POLICY IF EXISTS "Admins can update any review" ON public.service_reviews;
CREATE POLICY "Admins can update any review" ON public.service_reviews
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete any review" ON public.service_reviews;
CREATE POLICY "Admins can delete any review" ON public.service_reviews
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
