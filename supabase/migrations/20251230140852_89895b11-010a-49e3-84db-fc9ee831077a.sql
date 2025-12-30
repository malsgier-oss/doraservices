-- Add status and suspension fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Add authorization and operational fields to businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS authorization_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS authorization_note text,
ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Add featured field to deals
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Create platform_settings table for global toggles
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create user_reports table for flagging content
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid,
  reported_business_id uuid,
  reported_deal_id uuid,
  report_type text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resolution_note text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create admin_notes table for internal notes
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create admin_audit_log for tracking actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create platform_messages table for announcements
CREATE TABLE IF NOT EXISTS public.platform_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_messages junction table for tracking read status per user
CREATE TABLE IF NOT EXISTS public.user_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid REFERENCES public.platform_messages(id) ON DELETE CASCADE NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

-- Platform settings policies (admin only for write, public read for some)
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can read platform settings" ON public.platform_settings
FOR SELECT USING (true);

-- User reports policies
CREATE POLICY "Admins can view all reports" ON public.user_reports
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create reports" ON public.user_reports
FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports" ON public.user_reports
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Admin notes policies (admin only)
CREATE POLICY "Admins can manage notes" ON public.admin_notes
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Audit log policies (admin only)
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create audit entries" ON public.admin_audit_log
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Platform messages policies
CREATE POLICY "Admins can manage messages" ON public.platform_messages
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read messages" ON public.platform_messages
FOR SELECT USING (true);

-- User messages policies
CREATE POLICY "Users can view their messages" ON public.user_messages
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their message status" ON public.user_messages
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create user messages" ON public.user_messages
FOR INSERT WITH CHECK (true);

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('deal_publishing_enabled', 'true'),
  ('deals_visible', 'true'),
  ('business_registration_enabled', 'true'),
  ('user_registration_enabled', 'true'),
  ('max_deals_per_business', '10'),
  ('min_deal_duration_days', '1'),
  ('max_deal_duration_days', '90')
ON CONFLICT (key) DO NOTHING;

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$;

-- Update has_role function to support the new admin role
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