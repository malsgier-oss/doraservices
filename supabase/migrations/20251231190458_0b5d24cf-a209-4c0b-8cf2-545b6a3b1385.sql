-- Fix 1: Add admin role validation to log_admin_action function
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can log audit actions';
  END IF;
  
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$;

-- Fix 2: Restrict profiles table to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Authenticated users can view all profiles (needed for service provider lookup)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);