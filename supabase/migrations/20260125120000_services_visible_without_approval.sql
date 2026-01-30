-- New services show immediately without admin approval.
-- Update enforce_service_write so INSERT no longer forces approval_status='pending'
-- or is_visible=false based on provider_status.

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

  -- INSERT: new services are visible without admin approval (no provider_status gate).
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_active IS NULL THEN NEW.is_active := true; END IF;
    IF NEW.is_paused IS NULL THEN NEW.is_paused := false; END IF;
    IF NEW.approval_status IS NULL OR trim(NEW.approval_status) = '' THEN
      NEW.approval_status := 'approved';
    END IF;
    IF NEW.is_visible IS NULL THEN NEW.is_visible := true; END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: keep existing provider approval gate for *changes* (prevent self-approve of previously pending).
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

    -- provider cannot self-approve (change pending -> approved)
    IF lower(coalesce(NEW.approval_status, '')) = 'approved' AND lower(coalesce(OLD.approval_status, '')) <> 'approved' THEN
      NEW.approval_status := OLD.approval_status;
    END IF;

    -- soft delete: when deleted_at is set, force inactive+hidden
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      NEW.is_active := false;
      NEW.is_visible := false;
      NEW.is_paused := true;
    END IF;

    -- If critical public-facing fields change, set pending + hidden (re-approval required for edits)
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
