-- Add new columns to deals table for enhanced deal management
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS start_date timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS promo_code text,
ADD COLUMN IF NOT EXISTS terms_conditions text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks_count integer DEFAULT 0;

-- Add check constraint for status
ALTER TABLE public.deals 
ADD CONSTRAINT deals_status_check 
CHECK (status IN ('draft', 'active', 'paused', 'expired', 'scheduled'));

-- Add check constraint for discount_type
ALTER TABLE public.deals 
ADD CONSTRAINT deals_discount_type_check 
CHECK (discount_type IN ('percentage', 'fixed', 'free_item'));

-- Create function to auto-expire deals
CREATE OR REPLACE FUNCTION public.auto_expire_deals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark deals as expired if end date has passed
  UPDATE public.deals 
  SET status = 'expired', updated_at = now()
  WHERE expires_at < now() 
    AND status IN ('active', 'scheduled');
  RETURN NULL;
END;
$$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deals_business_id ON public.deals(business_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_category ON public.deals(category);