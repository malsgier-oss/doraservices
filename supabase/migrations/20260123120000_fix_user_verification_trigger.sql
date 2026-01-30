-- Fix handle_new_user() trigger to explicitly set is_verified=false and role='user'
-- This ensures new user profiles are created with correct verification status

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, is_verified, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'full_name',
    false, -- Explicitly set is_verified to false for new signups
    COALESCE(new.raw_user_meta_data ->> 'role', 'user') -- Use role from metadata or default to 'user'
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if profile already exists
  RETURN new;
END;
$$;
