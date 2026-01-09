-- =============================================
-- PROFILES TABLE: Restrict SELECT access
-- =============================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PASSWORD_RESET_REQUESTS TABLE: Admin-only SELECT
-- =============================================

-- The existing "Admins can manage password reset requests" policy with ALL 
-- already covers admin SELECT. We just need to ensure no other SELECT policies exist.
-- The INSERT policy for users is fine - they can create requests but not read them.