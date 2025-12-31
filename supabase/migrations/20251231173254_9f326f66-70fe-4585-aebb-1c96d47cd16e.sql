-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  icon TEXT NOT NULL DEFAULT 'Circle',
  color TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Subcategories are viewable by everyone" 
ON public.subcategories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage subcategories" 
ON public.subcategories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_subcategories_updated_at
BEFORE UPDATE ON public.subcategories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial subcategories based on existing categories
-- First, let's insert subcategories for each main category

-- Home Maintenance subcategories
INSERT INTO public.subcategories (category_id, name, name_ar, icon, display_order)
SELECT id, 'Electrician', 'كهربائي', 'Zap', 1 FROM public.categories WHERE name = 'Home Maintenance'
UNION ALL
SELECT id, 'Plumbing', 'سباكة', 'Droplets', 2 FROM public.categories WHERE name = 'Home Maintenance'
UNION ALL
SELECT id, 'AC Repair', 'تكييف', 'Wind', 3 FROM public.categories WHERE name = 'Home Maintenance'
UNION ALL
SELECT id, 'Painting', 'دهان', 'Paintbrush', 4 FROM public.categories WHERE name = 'Home Maintenance'
UNION ALL
SELECT id, 'Carpentry', 'نجارة', 'Hammer', 5 FROM public.categories WHERE name = 'Home Maintenance';

-- Automotive subcategories
INSERT INTO public.subcategories (category_id, name, name_ar, icon, display_order)
SELECT id, 'Oil & Filter', 'زيت وفلتر', 'Droplet', 1 FROM public.categories WHERE name = 'Automotive'
UNION ALL
SELECT id, 'Inspection', 'فحص', 'Search', 2 FROM public.categories WHERE name = 'Automotive'
UNION ALL
SELECT id, 'Tires', 'إطارات', 'Circle', 3 FROM public.categories WHERE name = 'Automotive'
UNION ALL
SELECT id, 'Car Wash', 'غسيل سيارات', 'Sparkles', 4 FROM public.categories WHERE name = 'Automotive';

-- Power & Utilities subcategories
INSERT INTO public.subcategories (category_id, name, name_ar, icon, display_order)
SELECT id, 'Solar', 'طاقة شمسية', 'Sun', 1 FROM public.categories WHERE name = 'Power & Utilities'
UNION ALL
SELECT id, 'Generator', 'مولدات', 'Zap', 2 FROM public.categories WHERE name = 'Power & Utilities'
UNION ALL
SELECT id, 'Batteries', 'بطاريات', 'Battery', 3 FROM public.categories WHERE name = 'Power & Utilities';

-- Professional & Legal subcategories
INSERT INTO public.subcategories (category_id, name, name_ar, icon, display_order)
SELECT id, 'Legal', 'قانوني', 'Scale', 1 FROM public.categories WHERE name = 'Professional & Legal'
UNION ALL
SELECT id, 'Translation', 'ترجمة', 'Languages', 2 FROM public.categories WHERE name = 'Professional & Legal'
UNION ALL
SELECT id, 'Accounting', 'محاسبة', 'Calculator', 3 FROM public.categories WHERE name = 'Professional & Legal';

-- Events & Catering subcategories
INSERT INTO public.subcategories (category_id, name, name_ar, icon, display_order)
SELECT id, 'Photography', 'تصوير', 'Camera', 1 FROM public.categories WHERE name = 'Events & Catering'
UNION ALL
SELECT id, 'Catering', 'تموين', 'UtensilsCrossed', 2 FROM public.categories WHERE name = 'Events & Catering'
UNION ALL
SELECT id, 'Decoration', 'تزيين', 'Sparkles', 3 FROM public.categories WHERE name = 'Events & Catering';

-- Healing & Wellness subcategories
INSERT INTO public.subcategories (category_id, name, name_ar, icon, display_order)
SELECT id, 'Home Doctor', 'طبيب منزلي', 'Stethoscope', 1 FROM public.categories WHERE name = 'Healing & Wellness'
UNION ALL
SELECT id, 'Nursing', 'تمريض', 'Heart', 2 FROM public.categories WHERE name = 'Healing & Wellness'
UNION ALL
SELECT id, 'Physiotherapy', 'علاج طبيعي', 'Activity', 3 FROM public.categories WHERE name = 'Healing & Wellness';