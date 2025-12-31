-- Phase 1: Add new columns to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS admin_note TEXT,
ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Phase 2: Add new columns to service_reviews table
ALTER TABLE public.service_reviews 
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_hidden BOOLEAN NOT NULL DEFAULT false;

-- Phase 3: Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 4: Create cities table
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  region TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 5: Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 6: Create bulk_upload_jobs table
CREATE TABLE IF NOT EXISTS public.bulk_upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  error_log JSONB,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Phase 7: Add scheduled messaging columns to platform_messages
ALTER TABLE public.platform_messages 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_count INTEGER NOT NULL DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_upload_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories (public read, admin write)
CREATE POLICY "Categories are viewable by everyone" ON public.categories
FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for cities (public read, admin write)
CREATE POLICY "Cities are viewable by everyone" ON public.cities
FOR SELECT USING (true);

CREATE POLICY "Admins can manage cities" ON public.cities
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for analytics_events (admin only)
CREATE POLICY "Admins can manage analytics" ON public.analytics_events
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for bulk_upload_jobs (admin only)
CREATE POLICY "Admins can manage bulk uploads" ON public.bulk_upload_jobs
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any service
CREATE POLICY "Admins can update any service" ON public.services
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete any service
CREATE POLICY "Admins can delete any service" ON public.services
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any review
CREATE POLICY "Admins can update any review" ON public.service_reviews
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete any review
CREATE POLICY "Admins can delete any review" ON public.service_reviews
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default categories
INSERT INTO public.categories (name, name_ar, icon, color, display_order) VALUES
('Home Maintenance', 'صيانة المنزل', 'Wrench', 'bg-blue-500', 1),
('Beauty & Wellness', 'الجمال والعناية', 'Sparkles', 'bg-pink-500', 2),
('Automotive', 'السيارات', 'Car', 'bg-orange-500', 3),
('Education', 'التعليم', 'GraduationCap', 'bg-purple-500', 4),
('Events', 'المناسبات', 'PartyPopper', 'bg-yellow-500', 5),
('Technology', 'التقنية', 'Laptop', 'bg-cyan-500', 6),
('Health', 'الصحة', 'Heart', 'bg-red-500', 7),
('Legal & Finance', 'القانون والمالية', 'Scale', 'bg-emerald-500', 8),
('Photography', 'التصوير', 'Camera', 'bg-indigo-500', 9),
('Fitness', 'اللياقة', 'Dumbbell', 'bg-lime-500', 10);

-- Insert default cities
INSERT INTO public.cities (name, name_ar, region, display_order) VALUES
('Tripoli', 'طرابلس', 'Tripolitania', 1),
('Benghazi', 'بنغازي', 'Cyrenaica', 2),
('Misrata', 'مصراتة', 'Tripolitania', 3),
('Zawiya', 'الزاوية', 'Tripolitania', 4),
('Zliten', 'زليتن', 'Tripolitania', 5),
('Bayda', 'البيضاء', 'Cyrenaica', 6),
('Ajdabiya', 'أجدابيا', 'Cyrenaica', 7),
('Sebha', 'سبها', 'Fezzan', 8),
('Tobruk', 'طبرق', 'Cyrenaica', 9),
('Gharyan', 'غريان', 'Tripolitania', 10);

-- Insert new platform settings
INSERT INTO public.platform_settings (key, value) VALUES
('call_enabled', 'true'),
('messaging_enabled', 'true'),
('guest_browsing_enabled', 'true'),
('phone_format', '"09x xxx xx xx"'),
('default_city', '"Tripoli"'),
('max_services_per_provider', '50'),
('review_min_length', '10'),
('auto_approve_providers', 'false'),
('require_provider_verification', 'true')
ON CONFLICT (key) DO NOTHING;

-- Create updated_at trigger for categories
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();