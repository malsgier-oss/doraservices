-- Fix profile role check constraint to allow all valid role values
-- The constraint should allow: 'user', 'business', 'provider', 'admin', and 'client'

-- Drop existing constraint if it exists (handle different possible names)
DO $$ 
BEGIN
  -- Try to drop constraint with the exact name from the error
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profile_role_check' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profile_role_check;
  END IF;
  
  -- Also try other possible constraint names
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

-- Add the correct constraint that allows all valid role values
ALTER TABLE public.profiles 
ADD CONSTRAINT profile_role_check 
CHECK (role IS NULL OR role IN ('user', 'business', 'provider', 'admin', 'client'));
