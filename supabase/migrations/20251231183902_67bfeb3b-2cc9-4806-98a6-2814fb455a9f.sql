-- Create sub_cities table
CREATE TABLE public.sub_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_cities ENABLE ROW LEVEL SECURITY;

-- Everyone can view sub-cities
CREATE POLICY "Sub cities are viewable by everyone"
  ON public.sub_cities FOR SELECT USING (true);

-- Admins can manage sub-cities
CREATE POLICY "Admins can manage sub cities"
  ON public.sub_cities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add sub_city column to services table
ALTER TABLE public.services ADD COLUMN sub_city TEXT;

-- Add sub_city column to profiles table
ALTER TABLE public.profiles ADD COLUMN sub_city TEXT;