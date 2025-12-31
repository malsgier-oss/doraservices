-- Make user_id nullable for unclaimed services
ALTER TABLE public.services 
ALTER COLUMN user_id DROP NOT NULL;

-- Make price nullable (provider sets it after claiming)
ALTER TABLE public.services 
ALTER COLUMN price DROP NOT NULL;

-- Add provider_phone and provider_name for claiming
ALTER TABLE public.services 
ADD COLUMN provider_phone TEXT,
ADD COLUMN provider_name TEXT;

-- Create trigger function to auto-claim services when user signs up with matching phone
CREATE OR REPLACE FUNCTION public.claim_services_by_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- When a profile is created/updated with a phone number
  IF NEW.phone IS NOT NULL THEN
    UPDATE public.services 
    SET user_id = NEW.user_id,
        updated_at = now()
    WHERE provider_phone = NEW.phone 
      AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_phone_claim
  AFTER INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_services_by_phone();

-- Update RLS policy to allow admins to create services without user_id
DROP POLICY IF EXISTS "Users can create their own services" ON public.services;
CREATE POLICY "Users can create their own services" 
ON public.services 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));