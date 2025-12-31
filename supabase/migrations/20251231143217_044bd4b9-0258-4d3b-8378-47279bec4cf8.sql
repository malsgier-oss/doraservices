-- Add provider_status column to profiles for approval workflow
-- Providers start as 'pending' and must be approved by admin to be 'approved'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS provider_status text DEFAULT 'pending' CHECK (provider_status IN ('pending', 'approved', 'rejected'));

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.provider_status IS 'For business users: pending = awaiting approval, approved = can list services publicly, rejected = not allowed to list services';