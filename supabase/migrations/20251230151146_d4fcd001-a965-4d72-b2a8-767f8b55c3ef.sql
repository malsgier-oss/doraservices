-- Fix: Prevent users from self-assigning admin role (Privilege Escalation vulnerability)
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;

-- Create a new policy that only allows users to assign 'user' or 'business' roles to themselves
CREATE POLICY "Users can insert their own non-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role IN ('user'::app_role, 'business'::app_role)
);

-- Admins can assign any role (including admin) to any user
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert any roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);