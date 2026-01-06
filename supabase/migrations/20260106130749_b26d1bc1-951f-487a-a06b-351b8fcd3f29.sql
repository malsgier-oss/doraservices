-- Update profiles table with new columns for verification system
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id),
ADD COLUMN IF NOT EXISTS role text DEFAULT 'client',
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS verified_by uuid NULL,
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Add unique constraint on phone (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);
  END IF;
END $$;

-- Create password_reset_requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.cities(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'rejected')),
  created_at timestamptz DEFAULT now(),
  handled_by uuid NULL,
  handled_at timestamptz NULL,
  notes text NULL
);

-- Enable RLS on password_reset_requests
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for password_reset_requests
CREATE POLICY "Admins can manage password reset requests"
ON public.password_reset_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own reset requests"
ON public.password_reset_requests
FOR INSERT
WITH CHECK (true);

-- Update service_reviews RLS to require verified users
DROP POLICY IF EXISTS "Users can create reviews" ON public.service_reviews;
CREATE POLICY "Verified users can create reviews"
ON public.service_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_verified = true
  )
);

-- Update services RLS to require verified providers
DROP POLICY IF EXISTS "Users can create their own services" ON public.services;
CREATE POLICY "Verified users can create services"
ON public.services
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_verified = true
    )
  )
);

-- Update services UPDATE policy for verified providers
DROP POLICY IF EXISTS "Users can update their own services" ON public.services;
CREATE POLICY "Verified users can update their own services"
ON public.services
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_verified = true
  )
);

-- Add RLS policy for admins to update profiles verification fields
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_phone ON public.password_reset_requests(phone);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON public.password_reset_requests(status);