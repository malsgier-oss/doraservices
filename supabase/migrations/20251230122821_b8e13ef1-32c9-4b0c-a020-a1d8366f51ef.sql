-- Allow self-serve role assignment for the current user (required for business signup/upgrade)
-- and prevent duplicate roles.

-- 1) Deduplicate existing user_roles rows per (user_id, role)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id
  AND a.role = b.role
  AND a.ctid > b.ctid;

-- 2) Enforce uniqueness to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_uidx
  ON public.user_roles (user_id, role);

-- 3) Add INSERT policy so users can assign roles to themselves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Users can insert their own roles'
  ) THEN
    CREATE POLICY "Users can insert their own roles"
    ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- (Optional but safe) allow users to remove a role they previously assigned to themselves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Users can delete their own roles'
  ) THEN
    CREATE POLICY "Users can delete their own roles"
    ON public.user_roles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;