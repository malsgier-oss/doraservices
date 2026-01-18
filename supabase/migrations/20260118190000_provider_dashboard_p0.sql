-- Dora P0: Provider dashboard service controls
-- - Soft-delete services (deleted_at)
-- - Allow providers to create/edit their own services without the old "is_verified" gate
-- - Prevent providers from self-approving/featuring/forcing visibility

-- 1) Soft delete column
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_services_deleted_at ON public.services(deleted_at);

-- 2) Update RLS policies on services (replace old verification-based ones)
-- NOTE: We keep public SELECT policies as-is. These changes focus on provider write controls.

DROP POLICY IF EXISTS "Verified users can create services" ON public.services;
DROP POLICY IF EXISTS "Verified users can update their own services" ON public.services;
DROP POLICY IF EXISTS "Users can create their own services" ON public.services;
DROP POLICY IF EXISTS "Users can update their own services" ON public.services;

-- Provider-like roles: 'provider' (legacy) or 'business' (enum-style).
CREATE POLICY "Providers and admins can create services"
ON public.services
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, '')) IN ('provider', 'business')
        AND lower(coalesce(p.status, 'active')) = 'active'
    )
  )
);

CREATE POLICY "Providers can update their own services"
ON public.services
FOR UPDATE
USING (
  (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, '')) IN ('provider', 'business')
        AND lower(coalesce(p.status, 'active')) = 'active'
    )
  )
);

-- Hard-deletes are admin-only (providers should use soft-delete).
DROP POLICY IF EXISTS "Users can delete their own services" ON public.services;
CREATE POLICY "Admins can delete services"
ON public.services
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Server-side enforcement via trigger
-- Prevent column abuse and ensure pending visibility rules.

CREATE OR REPLACE FUNCTION public.enforce_service_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin boolean;
  provider_status text;
  profile_status text;
  role_text text;
  critical_changed boolean := false;
BEGIN
  is_admin := has_role(auth.uid(), 'admin'::app_role);

  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Providers only; block suspended/deleted/inactive accounts.
  SELECT lower(coalesce(p.role, '')),
         lower(coalesce(p.provider_status, 'pending')),
         lower(coalesce(p.status, 'active'))
    INTO role_text, provider_status, profile_status
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  IF role_text NOT IN ('provider', 'business') THEN
    RAISE EXCEPTION 'Only providers can write services';
  END IF;

  IF profile_status <> 'active' THEN
    RAISE EXCEPTION 'Account is not active';
  END IF;

  -- Ensure ownership
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot write services for another user';
  END IF;

  -- Enforce provider approval -> visibility rules
  IF provider_status <> 'approved' THEN
    NEW.approval_status := 'pending';
    NEW.is_visible := false;
  END IF;

  -- INSERT defaults
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_active IS NULL THEN NEW.is_active := true; END IF;
    IF NEW.is_paused IS NULL THEN NEW.is_paused := false; END IF;

    -- Approved providers: default approved if not explicitly set.
    IF provider_status = 'approved' AND (NEW.approval_status IS NULL OR NEW.approval_status = '') THEN
      NEW.approval_status := 'approved';
      IF NEW.is_visible IS NULL THEN NEW.is_visible := true; END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE: protect admin-only fields
  IF TG_OP = 'UPDATE' THEN
    -- prevent undelete by providers
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      NEW.deleted_at := OLD.deleted_at;
    END IF;

    -- admin-only fields
    NEW.is_featured := OLD.is_featured;
    NEW.featured_order := OLD.featured_order;
    NEW.admin_note := OLD.admin_note;

    -- provider cannot force visibility on
    IF NEW.is_visible <> OLD.is_visible THEN
      NEW.is_visible := OLD.is_visible;
    END IF;

    -- provider cannot self-approve
    IF lower(coalesce(NEW.approval_status, '')) = 'approved' AND lower(coalesce(OLD.approval_status, '')) <> 'approved' THEN
      NEW.approval_status := OLD.approval_status;
    END IF;

    -- soft delete: when deleted_at is set, force inactive+hidden
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      NEW.is_active := false;
      NEW.is_visible := false;
      NEW.is_paused := true;
    END IF;

    -- If critical public-facing fields change, set pending + hidden
    critical_changed :=
      (NEW.title IS DISTINCT FROM OLD.title)
      OR (NEW.description IS DISTINCT FROM OLD.description)
      OR (NEW.category IS DISTINCT FROM OLD.category)
      OR (NEW.price IS DISTINCT FROM OLD.price)
      OR (NEW.city IS DISTINCT FROM OLD.city)
      OR (NEW.sub_city IS DISTINCT FROM OLD.sub_city)
      OR (NEW.image_url IS DISTINCT FROM OLD.image_url);

    IF critical_changed THEN
      NEW.approval_status := 'pending';
      NEW.is_visible := false;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_services_enforce_service_write ON public.services;
CREATE TRIGGER trg_services_enforce_service_write
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.enforce_service_write();
