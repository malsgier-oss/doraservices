-- Dora P0/P1: Harden public visibility rules for services.
-- Goal: public can only see approved + visible + active + not paused + not soft-deleted.
-- Providers can always see their own services (including pending/hidden) except soft-deleted.
-- Admins can see all rows.

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Replace the original wide-open policy from the first migration.
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;

-- Public (anonymous + authenticated) browsing
DROP POLICY IF EXISTS "Public can view visible approved services" ON public.services;
CREATE POLICY "Public can view visible approved services"
ON public.services
FOR SELECT
USING (
  deleted_at IS NULL
  AND is_active = true
  AND is_paused = false
  AND is_visible = true
  AND lower(coalesce(approval_status, 'pending')) = 'approved'
);

-- Providers can view their own (for dashboard/edit flows)
DROP POLICY IF EXISTS "Providers can view their own services" ON public.services;
CREATE POLICY "Providers can view their own services"
ON public.services
FOR SELECT
USING (
  deleted_at IS NULL
  AND auth.uid() = user_id
);

-- Admins can view all services (including deleted) for moderation
DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
CREATE POLICY "Admins can view all services"
ON public.services
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
