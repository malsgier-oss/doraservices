-- =====================================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- Generated from Lovable Cloud project
-- Run this in your own Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('user', 'business', 'admin');

-- =====================================================
-- STEP 2: CORE FUNCTIONS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Handle new user signup (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'user');
  RETURN new;
END;
$$;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =====================================================
-- STEP 3: TABLES
-- =====================================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  city TEXT,
  sub_city TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'Explorer',
  status TEXT NOT NULL DEFAULT 'active',
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_reason TEXT,
  provider_status TEXT DEFAULT 'pending' CHECK (provider_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Saved businesses table
CREATE TABLE public.saved_businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);

-- Businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT,
  description TEXT,
  image_url TEXT,
  authorization_status TEXT NOT NULL DEFAULT 'pending',
  authorization_note TEXT,
  operational_status TEXT NOT NULL DEFAULT 'active',
  featured BOOLEAN NOT NULL DEFAULT false,
  suspended_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Deals table
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  discount_type TEXT DEFAULT 'percentage',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  promo_code TEXT,
  terms_conditions TEXT,
  status TEXT DEFAULT 'draft',
  image_url TEXT,
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT deals_status_check CHECK (status = ANY (ARRAY['draft', 'active', 'inactive', 'paused', 'expired', 'scheduled', 'archived'])),
  CONSTRAINT deals_discount_type_check CHECK (discount_type IN ('percentage', 'fixed', 'free_item'))
);

-- Posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX reviews_user_business_unique ON public.reviews (user_id, business_id);

-- Services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC(10,2),
  image_url TEXT,
  city TEXT,
  sub_city TEXT,
  provider_phone TEXT,
  provider_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  featured_order INTEGER DEFAULT NULL,
  approval_status TEXT NOT NULL DEFAULT 'approved',
  admin_note TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  description TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service reviews table
CREATE TABLE public.service_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  admin_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, user_id)
);

-- Categories table
CREATE TABLE public.categories (
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

-- Subcategories table
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

-- Cities table
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  region TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sub-cities table
CREATE TABLE public.sub_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform settings table
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- User reports table
CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid,
  reported_business_id uuid,
  reported_deal_id uuid,
  reported_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  call_log_id UUID,
  report_type text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resolution_note text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Admin notes table
CREATE TABLE public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Admin audit log table
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Platform messages table
CREATE TABLE public.platform_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all',
  is_read boolean NOT NULL DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivery_count INTEGER NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User messages table
CREATE TABLE public.user_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid REFERENCES public.platform_messages(id) ON DELETE CASCADE NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Analytics events table
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bulk upload jobs table
CREATE TABLE public.bulk_upload_jobs (
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

-- Call logs table
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  caller_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification events table
CREATE TABLE public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Review prompts table
CREATE TABLE public.review_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  call_log_id UUID REFERENCES public.call_logs(id) ON DELETE CASCADE,
  trigger_at TIMESTAMPTZ NOT NULL,
  prompt_sent_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Provider stats table
CREATE TABLE public.provider_stats (
  provider_id UUID PRIMARY KEY,
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_favorites INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Push tokens table
CREATE TABLE public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  device_type TEXT DEFAULT 'web',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, player_id)
);

-- Add foreign key for user_reports.call_log_id
ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_call_log_id_fkey 
  FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 4: ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_upload_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert their own non-admin roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role IN ('user'::app_role, 'business'::app_role));
CREATE POLICY "Admins can insert any roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete their own roles" ON public.user_roles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Saved businesses policies
CREATE POLICY "Users can view their own saved businesses" ON public.saved_businesses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save businesses" ON public.saved_businesses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave businesses" ON public.saved_businesses FOR DELETE USING (auth.uid() = user_id);

-- Businesses policies
CREATE POLICY "Businesses are viewable by everyone" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "Users can create their own business" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own business" ON public.businesses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own business" ON public.businesses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any business" ON public.businesses FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Deals policies
CREATE POLICY "Deals are viewable by everyone" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Business owners can create deals" ON public.deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Business owners can update their deals" ON public.deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Business owners can delete their deals" ON public.deals FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any deal" ON public.deals FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Posts policies
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create their own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Services policies
CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Users can create their own services" ON public.services FOR INSERT WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update their own services" ON public.services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own services" ON public.services FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any service" ON public.services FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete any service" ON public.services FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Bookings policies
CREATE POLICY "Users can view their bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Providers can view their service bookings" ON public.bookings FOR SELECT USING (auth.uid() = provider_id);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Providers can update their service bookings" ON public.bookings FOR UPDATE USING (auth.uid() = provider_id);

-- Service reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON public.service_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.service_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.service_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.service_reviews FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any review" ON public.service_reviews FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete any review" ON public.service_reviews FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Categories policies
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Subcategories policies
CREATE POLICY "Subcategories are viewable by everyone" ON public.subcategories FOR SELECT USING (true);
CREATE POLICY "Admins can manage subcategories" ON public.subcategories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Cities policies
CREATE POLICY "Cities are viewable by everyone" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Admins can manage cities" ON public.cities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Sub-cities policies
CREATE POLICY "Sub cities are viewable by everyone" ON public.sub_cities FOR SELECT USING (true);
CREATE POLICY "Admins can manage sub cities" ON public.sub_cities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Platform settings policies
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Everyone can read platform settings" ON public.platform_settings FOR SELECT USING (true);

-- User reports policies
CREATE POLICY "Admins can view all reports" ON public.user_reports FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create reports" ON public.user_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can update reports" ON public.user_reports FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Admin notes policies
CREATE POLICY "Admins can manage notes" ON public.admin_notes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin audit log policies
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create audit entries" ON public.admin_audit_log FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Platform messages policies
CREATE POLICY "Admins can manage messages" ON public.platform_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read messages" ON public.platform_messages FOR SELECT USING (true);

-- User messages policies
CREATE POLICY "Users can view their messages" ON public.user_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their message status" ON public.user_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create user messages" ON public.user_messages FOR INSERT WITH CHECK (true);

-- Analytics events policies
CREATE POLICY "Admins can manage analytics" ON public.analytics_events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Bulk upload jobs policies
CREATE POLICY "Admins can manage bulk uploads" ON public.bulk_upload_jobs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Call logs policies
CREATE POLICY "Users can insert their own calls" ON public.call_logs FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Providers can view calls to their services" ON public.call_logs FOR SELECT USING (auth.uid() = provider_id OR auth.uid() = caller_id);
CREATE POLICY "Admins can view all call logs" ON public.call_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Notification events policies
CREATE POLICY "Users can view their own notifications" ON public.notification_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notification_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notification_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all notifications" ON public.notification_events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Review prompts policies
CREATE POLICY "Users can view their own review prompts" ON public.review_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own review prompts" ON public.review_prompts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert review prompts" ON public.review_prompts FOR INSERT WITH CHECK (true);

-- Provider stats policies
CREATE POLICY "Provider stats are viewable by everyone" ON public.provider_stats FOR SELECT USING (true);
CREATE POLICY "System can manage provider stats" ON public.provider_stats FOR ALL USING (true);

-- Push tokens policies
CREATE POLICY "Users can manage their own push tokens" ON public.push_tokens FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- STEP 6: TRIGGERS
-- =====================================================

-- Create profile on auth user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create user role on auth user signup
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_reviews_updated_at BEFORE UPDATE ON public.service_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 7: ADDITIONAL FUNCTIONS
-- =====================================================

-- Claim services by phone
CREATE OR REPLACE FUNCTION public.claim_services_by_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    UPDATE public.services 
    SET user_id = NEW.user_id, updated_at = now()
    WHERE provider_phone = NEW.phone AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_phone_claim
  AFTER INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.claim_services_by_phone();

-- Update provider stats on call
CREATE OR REPLACE FUNCTION public.update_provider_stats_on_call()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.provider_stats (provider_id, total_calls, updated_at)
  VALUES (NEW.provider_id, 1, now())
  ON CONFLICT (provider_id)
  DO UPDATE SET total_calls = provider_stats.total_calls + 1, updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_call_log_insert
  AFTER INSERT ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_stats_on_call();

-- Update provider stats on favorite
CREATE OR REPLACE FUNCTION public.update_provider_stats_on_favorite()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO v_provider_id FROM public.services WHERE id::text = NEW.business_id;
    IF v_provider_id IS NOT NULL THEN
      INSERT INTO public.provider_stats (provider_id, total_favorites, updated_at)
      VALUES (v_provider_id, 1, now())
      ON CONFLICT (provider_id)
      DO UPDATE SET total_favorites = provider_stats.total_favorites + 1, updated_at = now();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT user_id INTO v_provider_id FROM public.services WHERE id::text = OLD.business_id;
    IF v_provider_id IS NOT NULL THEN
      UPDATE public.provider_stats SET total_favorites = GREATEST(0, total_favorites - 1), updated_at = now() WHERE provider_id = v_provider_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_favorite_change
  AFTER INSERT OR DELETE ON public.saved_businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_stats_on_favorite();

-- Create review prompt after call
CREATE OR REPLACE FUNCTION public.create_review_prompt_after_call()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_trigger_at TIMESTAMPTZ;
  v_hour INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM public.review_prompts WHERE user_id = NEW.caller_id AND provider_id = NEW.provider_id) THEN
    RETURN NEW;
  END IF;
  v_hour := EXTRACT(HOUR FROM now());
  IF v_hour < 18 THEN
    v_trigger_at := now() + INTERVAL '3 hours';
  ELSE
    v_trigger_at := date_trunc('day', now() + INTERVAL '1 day') + INTERVAL '8 hours';
  END IF;
  INSERT INTO public.review_prompts (user_id, service_id, provider_id, call_log_id, trigger_at)
  VALUES (NEW.caller_id, NEW.service_id, NEW.provider_id, NEW.id, v_trigger_at);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_call_create_review_prompt
  AFTER INSERT ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.create_review_prompt_after_call();

-- Distribute platform message
CREATE OR REPLACE FUNCTION public.distribute_platform_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_audience = 'all' THEN
    INSERT INTO public.user_messages (user_id, message_id)
    SELECT p.user_id, NEW.id FROM public.profiles p WHERE p.status = 'active';
  ELSIF NEW.target_audience = 'users' THEN
    INSERT INTO public.user_messages (user_id, message_id)
    SELECT p.user_id, NEW.id FROM public.profiles p
    WHERE p.status = 'active' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'business');
  ELSIF NEW.target_audience = 'businesses' THEN
    INSERT INTO public.user_messages (user_id, message_id)
    SELECT p.user_id, NEW.id FROM public.profiles p
    WHERE p.status = 'active' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'business');
  END IF;
  UPDATE public.platform_messages SET delivery_count = (SELECT COUNT(*) FROM public.user_messages WHERE message_id = NEW.id), sent_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER distribute_message_trigger
  AFTER INSERT ON public.platform_messages
  FOR EACH ROW EXECUTE FUNCTION public.distribute_platform_message();

-- Create user notification
CREATE OR REPLACE FUNCTION public.create_user_notification(p_user_id uuid, p_title text, p_content text)
RETURNS uuid AS $$
DECLARE
  v_message_id uuid;
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();
  INSERT INTO public.platform_messages (sender_id, title, content, target_audience, sent_at)
  VALUES (v_admin_id, p_title, p_content, 'individual') RETURNING id INTO v_message_id;
  INSERT INTO public.user_messages (user_id, message_id) VALUES (p_user_id, v_message_id);
  UPDATE public.platform_messages SET delivery_count = 1 WHERE id = v_message_id;
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Log admin action
CREATE OR REPLACE FUNCTION public.log_admin_action(p_action text, p_target_type text, p_target_id uuid DEFAULT NULL, p_details jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can log audit actions';
  END IF;
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$;

-- Auto expire deals
CREATE OR REPLACE FUNCTION public.auto_expire_deals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.deals SET status = 'expired', updated_at = now()
  WHERE expires_at < now() AND status IN ('active', 'scheduled');
  RETURN NULL;
END;
$$;

-- =====================================================
-- STEP 8: INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_deals_business_id ON public.deals(business_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_category ON public.deals(category);
CREATE INDEX IF NOT EXISTS idx_service_reviews_service_id ON public.service_reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_provider_id ON public.service_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_provider ON public.call_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_service ON public.call_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON public.call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_events_user ON public.notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_unread ON public.notification_events(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_review_prompts_pending ON public.review_prompts(user_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_services_approval ON public.services(approval_status);
CREATE INDEX IF NOT EXISTS idx_services_paused ON public.services(is_paused);
CREATE INDEX IF NOT EXISTS idx_services_is_featured ON public.services(is_featured, featured_order) WHERE is_featured = true;

-- =====================================================
-- STEP 9: STORAGE BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- STEP 10: SEED DATA
-- =====================================================

-- Default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('deal_publishing_enabled', 'true'),
  ('deals_visible', 'true'),
  ('business_registration_enabled', 'true'),
  ('user_registration_enabled', 'true'),
  ('max_deals_per_business', '10'),
  ('min_deal_duration_days', '1'),
  ('max_deal_duration_days', '90'),
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

-- Default categories
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

-- Default cities
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

-- =====================================================
-- DONE! Your schema is ready.
-- =====================================================
