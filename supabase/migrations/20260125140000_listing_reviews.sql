-- Listing reviews: allow buyers to rate listings (and optionally leave feedback).

CREATE TABLE IF NOT EXISTS public.listing_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_key TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listing_reviews_user_or_reviewer_check CHECK (user_id IS NOT NULL OR reviewer_key IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS listing_reviews_unique_auth_user
  ON public.listing_reviews(listing_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS listing_reviews_unique_anon_reviewer
  ON public.listing_reviews(listing_id, reviewer_key)
  WHERE reviewer_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS listing_reviews_listing_id_idx ON public.listing_reviews(listing_id);

ALTER TABLE public.listing_reviews ENABLE ROW LEVEL SECURITY;

-- Public read so the detail sheet can show reviews
DROP POLICY IF EXISTS "Public can read listing reviews" ON public.listing_reviews;
CREATE POLICY "Public can read listing reviews"
  ON public.listing_reviews FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated users can create listing reviews"
  ON public.listing_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anonymous users can create listing reviews"
  ON public.listing_reviews FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND reviewer_key IS NOT NULL);

CREATE POLICY "Users can update their own listing review"
  ON public.listing_reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listing review"
  ON public.listing_reviews FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any listing review"
  ON public.listing_reviews FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any listing review"
  ON public.listing_reviews FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Stats table (publicly readable)
CREATE TABLE IF NOT EXISTS public.listing_review_stats (
  listing_id UUID PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  average_rating NUMERIC NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_review_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read listing review stats" ON public.listing_review_stats;
CREATE POLICY "Public can read listing review stats"
  ON public.listing_review_stats FOR SELECT TO anon, authenticated USING (true);

-- Recompute stats for a listing
CREATE OR REPLACE FUNCTION public.recompute_listing_review_stats(p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg NUMERIC;
  v_cnt INTEGER;
BEGIN
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COALESCE(COUNT(*), 0)
  INTO v_avg, v_cnt
  FROM public.listing_reviews WHERE listing_id = p_listing_id;

  INSERT INTO public.listing_review_stats(listing_id, average_rating, total_reviews, updated_at)
  VALUES (p_listing_id, v_avg, v_cnt, now())
  ON CONFLICT (listing_id)
  DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_reviews = EXCLUDED.total_reviews,
    updated_at = now();
END;
$$;

-- Trigger to keep stats in sync
CREATE OR REPLACE FUNCTION public.handle_listing_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_listing_review_stats(OLD.listing_id);
  ELSE
    PERFORM public.recompute_listing_review_stats(NEW.listing_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_review_change ON public.listing_reviews;
CREATE TRIGGER on_listing_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.listing_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_listing_review_change();

-- updated_at trigger
DROP TRIGGER IF EXISTS update_listing_reviews_updated_at ON public.listing_reviews;
CREATE TRIGGER update_listing_reviews_updated_at
  BEFORE UPDATE ON public.listing_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
