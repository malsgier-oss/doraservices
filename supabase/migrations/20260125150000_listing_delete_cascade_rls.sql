-- Fix: When a provider deletes their listing, ON DELETE CASCADE tries to remove
-- listing_reviews and listing_review_stats. Those deletes were blocked by RLS
-- (no DELETE policy on stats; reviews only allowed reviewer/admin to delete).
-- Add policies so listing owners can delete related reviews and stats when
-- deleting their own listing.

-- Listing owners can delete any review on their listing (needed for CASCADE when listing is deleted)
CREATE POLICY "Listing owners can delete reviews on their listings"
  ON public.listing_reviews
  FOR DELETE
  TO authenticated
  USING (
    listing_id IN (SELECT id FROM public.listings WHERE user_id = auth.uid())
  );

-- Listing owners and admins can delete stats for a listing (needed for CASCADE; stats had no DELETE policy)
CREATE POLICY "Listing owners and admins can delete listing review stats"
  ON public.listing_review_stats
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR listing_id IN (SELECT id FROM public.listings WHERE user_id = auth.uid())
  );
