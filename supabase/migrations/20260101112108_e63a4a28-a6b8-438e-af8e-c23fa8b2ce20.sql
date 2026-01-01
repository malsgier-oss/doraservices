-- Phase 1: Database Schema Enhancements

-- 1.1 New Tables

-- call_logs - Track all call click events
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  caller_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_logs
CREATE POLICY "Users can insert their own calls"
  ON public.call_logs FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Providers can view calls to their services"
  ON public.call_logs FOR SELECT
  USING (auth.uid() = provider_id OR auth.uid() = caller_id);

CREATE POLICY "Admins can view all call logs"
  ON public.call_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- notification_events - In-app notification queue
CREATE TABLE public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- call_received, favorite_added, review_prompt, service_approved, service_rejected
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_events
CREATE POLICY "Users can view their own notifications"
  ON public.notification_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notification_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notification_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications"
  ON public.notification_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- review_prompts - Delayed review request tracking
CREATE TABLE public.review_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  call_log_id UUID REFERENCES public.call_logs(id) ON DELETE CASCADE,
  trigger_at TIMESTAMPTZ NOT NULL, -- When to send the prompt
  prompt_sent_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, dismissed, completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_prompts ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_prompts
CREATE POLICY "Users can view their own review prompts"
  ON public.review_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own review prompts"
  ON public.review_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert review prompts"
  ON public.review_prompts FOR INSERT
  WITH CHECK (true);

-- provider_stats - Cached analytics
CREATE TABLE public.provider_stats (
  provider_id UUID PRIMARY KEY,
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_favorites INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for provider_stats
CREATE POLICY "Provider stats are viewable by everyone"
  ON public.provider_stats FOR SELECT
  USING (true);

CREATE POLICY "System can manage provider stats"
  ON public.provider_stats FOR ALL
  USING (true);

-- push_tokens - OneSignal push notification tokens
CREATE TABLE public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id TEXT NOT NULL, -- OneSignal player ID
  device_type TEXT DEFAULT 'web',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, player_id)
);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_tokens
CREATE POLICY "Users can manage their own push tokens"
  ON public.push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- 1.2 Schema Modifications

-- Add is_paused to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false;

-- Add approval_status to services (existing services are auto-approved)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';

-- Add reported_service_id to user_reports
ALTER TABLE public.user_reports ADD COLUMN IF NOT EXISTS reported_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- Add call_log_id to user_reports (for provider-to-client reports)
ALTER TABLE public.user_reports ADD COLUMN IF NOT EXISTS call_log_id UUID REFERENCES public.call_logs(id) ON DELETE SET NULL;

-- 1.3 Database Functions

-- Function to update provider stats on call
CREATE OR REPLACE FUNCTION public.update_provider_stats_on_call()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.provider_stats (provider_id, total_calls, updated_at)
  VALUES (NEW.provider_id, 1, now())
  ON CONFLICT (provider_id)
  DO UPDATE SET 
    total_calls = provider_stats.total_calls + 1,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for call stats
CREATE TRIGGER on_call_log_insert
  AFTER INSERT ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_stats_on_call();

-- Function to update provider stats on favorite
CREATE OR REPLACE FUNCTION public.update_provider_stats_on_favorite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get provider_id from service
    SELECT user_id INTO v_provider_id FROM public.services WHERE id::text = NEW.business_id;
    
    IF v_provider_id IS NOT NULL THEN
      INSERT INTO public.provider_stats (provider_id, total_favorites, updated_at)
      VALUES (v_provider_id, 1, now())
      ON CONFLICT (provider_id)
      DO UPDATE SET 
        total_favorites = provider_stats.total_favorites + 1,
        updated_at = now();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT user_id INTO v_provider_id FROM public.services WHERE id::text = OLD.business_id;
    
    IF v_provider_id IS NOT NULL THEN
      UPDATE public.provider_stats 
      SET total_favorites = GREATEST(0, total_favorites - 1), updated_at = now()
      WHERE provider_id = v_provider_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for favorite stats
CREATE TRIGGER on_favorite_change
  AFTER INSERT OR DELETE ON public.saved_businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_stats_on_favorite();

-- Function to create review prompt after call
CREATE OR REPLACE FUNCTION public.create_review_prompt_after_call()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trigger_at TIMESTAMPTZ;
  v_hour INTEGER;
BEGIN
  -- Check if a review prompt already exists for this user+provider combo
  IF EXISTS (
    SELECT 1 FROM public.review_prompts 
    WHERE user_id = NEW.caller_id AND provider_id = NEW.provider_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Calculate trigger time based on current hour
  v_hour := EXTRACT(HOUR FROM now());
  
  IF v_hour < 18 THEN
    -- Before 6pm: trigger 2-6 hours later (using 3 hours as middle)
    v_trigger_at := now() + INTERVAL '3 hours';
  ELSE
    -- After 6pm: trigger next morning at 8am
    v_trigger_at := date_trunc('day', now() + INTERVAL '1 day') + INTERVAL '8 hours';
  END IF;

  -- Create review prompt
  INSERT INTO public.review_prompts (user_id, service_id, provider_id, call_log_id, trigger_at)
  VALUES (NEW.caller_id, NEW.service_id, NEW.provider_id, NEW.id, v_trigger_at);

  RETURN NEW;
END;
$$;

-- Trigger for review prompts
CREATE TRIGGER on_call_create_review_prompt
  AFTER INSERT ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.create_review_prompt_after_call();

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_call_logs_provider ON public.call_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_service ON public.call_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON public.call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_events_user ON public.notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_unread ON public.notification_events(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_review_prompts_pending ON public.review_prompts(user_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_services_approval ON public.services(approval_status);
CREATE INDEX IF NOT EXISTS idx_services_paused ON public.services(is_paused);