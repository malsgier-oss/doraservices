-- Dora: Control Panel cleanup + analytics + messaging/notifications delete (Jan 18, 2026)

-- 1) Allow admins to SELECT service_events for dashboard analytics.
-- The telemetry table intentionally had no SELECT policies; admin dashboard needs aggregated counts.
ALTER TABLE IF EXISTS public.service_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read service events" ON public.service_events;
CREATE POLICY "Admins can read service events"
  ON public.service_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Notifications: allow users to delete their own user_messages (single + clear all).
ALTER TABLE IF EXISTS public.user_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete their messages" ON public.user_messages;
CREATE POLICY "Users can delete their messages"
  ON public.user_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage user_messages too (cleanup / support)
DROP POLICY IF EXISTS "Admins can manage user messages" ON public.user_messages;
CREATE POLICY "Admins can manage user messages"
  ON public.user_messages
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) Performance: notification inbox ordering
CREATE INDEX IF NOT EXISTS idx_user_messages_user_created_at
  ON public.user_messages (user_id, created_at DESC);

-- 4) Normalize platform_settings.value types.
-- Earlier seeds stored booleans and numbers as JSON strings (e.g., "true").
-- Convert known keys into real JSON booleans/numbers.
DO $$
BEGIN
  -- booleans
  UPDATE public.platform_settings
  SET value = CASE
      WHEN value = '"true"'::jsonb THEN 'true'::jsonb
      WHEN value = '"false"'::jsonb THEN 'false'::jsonb
      ELSE value
    END
  WHERE key IN (
    'deal_publishing_enabled',
    'deals_visible',
    'business_registration_enabled',
    'user_registration_enabled'
  )
  AND jsonb_typeof(value) = 'string';

  -- integers
  UPDATE public.platform_settings
  SET value = to_jsonb((value::text)::int)
  WHERE key IN (
    'max_deals_per_business',
    'min_deal_duration_days',
    'max_deal_duration_days'
  )
  AND jsonb_typeof(value) = 'string'
  AND (value::text) ~ '^[0-9]+$';
EXCEPTION WHEN undefined_table THEN
  -- If the table doesn't exist in some environments, do nothing.
  NULL;
END $$;
