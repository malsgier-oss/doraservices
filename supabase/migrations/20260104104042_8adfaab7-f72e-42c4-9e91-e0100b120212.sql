-- Add missing columns for featured services functionality
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_order INTEGER DEFAULT NULL;

-- Add partial index for faster featured services queries
CREATE INDEX IF NOT EXISTS idx_services_is_featured ON public.services(is_featured, featured_order) WHERE is_featured = true;