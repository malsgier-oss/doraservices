-- Phase 2 (Ship P0): RLS hardening for PII + notifications + business/deals visibility
-- Goals:
-- - Prevent broad profile access (PII) by removing "authenticated can view active profiles"
-- - Ensure platform messages are only readable when delivered to the user (via user_messages)
-- - Restrict businesses/deals public visibility to approved/active content
-- - Prevent owners from self-approving/featuring/moderating businesses/deals (trigger enforcement)

-- =============================================
-- 1) PROFILES: remove broad SELECT policy
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Expected remaining policies (created earlier):
-- - "Users can view their own profile" (SELECT)
-- - "Admins can view all profiles" (SELECT)
-- - "Users can update their own profile" (UPDATE)
-- - "Users can insert their own profile" (INSERT)

-- =============================================
-- 2) PLATFORM MESSAGES: only readable when delivered
-- =============================================
ALTER TABLE public.platform_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read messages" ON public.platform_messages;

CREATE POLICY "Users can read delivered messages"
  ON public.platform_messages
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_messages um
      WHERE um.message_id = platform_messages.id
        AND um.user_id = auth.uid()
    )
  );

-- =============================================
-- 3) BUSINESSES: restrict public visibility + prevent self-approval
-- =============================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON public.businesses;

CREATE POLICY "Public can view approved active businesses"
  ON public.businesses
  FOR SELECT
  TO anon, authenticated
  USING (
    lower(coalesce(authorization_status, 'pending')) = 'approved'
    AND lower(coalesce(operational_status, 'active')) = 'active'
    AND archived_at IS NULL
  );

CREATE POLICY "Owners can view their own businesses"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all businesses"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.enforce_business_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin boolean;
BEGIN
  is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Ensure ownership
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot write business for another user';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Users cannot self-approve or feature on insert
    NEW.authorization_status := 'pending';
    NEW.authorization_note := NULL;
    NEW.featured := false;
    NEW.operational_status := 'active';
    NEW.suspended_at := NULL;
    NEW.archived_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Admin-only columns: keep server-controlled values
    NEW.authorization_status := OLD.authorization_status;
    NEW.authorization_note := OLD.authorization_note;
    NEW.featured := OLD.featured;
    NEW.operational_status := OLD.operational_status;
    NEW.suspended_at := OLD.suspended_at;
    NEW.archived_at := OLD.archived_at;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_enforce_write ON public.businesses;
CREATE TRIGGER trg_businesses_enforce_write
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_business_write();

-- =============================================
-- 4) DEALS: restrict public visibility + prevent self-activation without approval
-- =============================================
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deals are viewable by everyone" ON public.deals;

CREATE POLICY "Public can view active deals for approved businesses"
  ON public.deals
  FOR SELECT
  TO anon, authenticated
  USING (
    lower(coalesce(status, 'draft')) = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = deals.business_id
        AND lower(coalesce(b.authorization_status, 'pending')) = 'approved'
        AND lower(coalesce(b.operational_status, 'active')) = 'active'
        AND b.archived_at IS NULL
    )
  );

CREATE POLICY "Owners can view their own deals"
  ON public.deals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deals"
  ON public.deals
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.enforce_deal_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin boolean;
  b_auth text;
  b_op text;
  b_archived timestamptz;
BEGIN
  is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Ensure ownership
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot write deal for another user';
  END IF;

  -- Prevent non-admins from setting admin-only fields
  IF TG_OP = 'UPDATE' THEN
    NEW.featured := OLD.featured;
    NEW.archived_at := OLD.archived_at;
  END IF;

  -- If attempting to activate a deal, require approved/active business
  IF lower(coalesce(NEW.status, 'draft')) = 'active' THEN
    SELECT lower(coalesce(b.authorization_status, 'pending')),
           lower(coalesce(b.operational_status, 'active')),
           b.archived_at
      INTO b_auth, b_op, b_archived
    FROM public.businesses b
    WHERE b.id = NEW.business_id;

    IF b_auth <> 'approved' OR b_op <> 'active' OR b_archived IS NOT NULL THEN
      RAISE EXCEPTION 'Business must be approved and active to activate deals';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deals_enforce_write ON public.deals;
CREATE TRIGGER trg_deals_enforce_write
BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.enforce_deal_write();

