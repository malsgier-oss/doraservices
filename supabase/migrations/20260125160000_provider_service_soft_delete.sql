-- Allow providers to soft-delete their own services even when profile is pending/suspended.
-- Previously both RLS and enforce_service_write required status='active' and role in
-- ('provider','business'), so soft-delete often failed.

-- 1) RLS: owners can perform an update that results in soft-delete (deleted_at set)
CREATE POLICY "Owners can soft-delete their own services"
  ON public.services
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- 2) Trigger: handle soft-delete early so it does not require active profile/role
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

  -- Soft-delete: allow owner to set deleted_at regardless of profile status/role
  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot write services for another user';
    END IF;
    NEW.is_featured := OLD.is_featured;
    NEW.featured_order := OLD.featured_order;
    NEW.admin_note := OLD.admin_note;
    NEW.is_active := false;
    NEW.is_visible := false;
    NEW.is_paused := true;
    RETURN NEW;
  END IF;

  -- Providers only; block suspended/deleted/inactive accounts (for non–soft-delete writes)
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

    -- soft delete: when deleted_at is set, force inactive+hidden (redundant if we took early exit, but safe)
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
