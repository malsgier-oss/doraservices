-- Dora P0: Anonymous-safe service event telemetry to power "alive" Hub signals.
-- Creates service_events, updates services.last_activity_at, and increments services.views_count.

-- 1) Services: add last_activity_at
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_services_last_activity_at
  ON public.services(last_activity_at DESC);

-- 2) Events table
CREATE TABLE IF NOT EXISTS public.service_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_id UUID NULL,
  user_id UUID NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_events ENABLE ROW LEVEL SECURITY;

-- Constrain event_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_events_event_type_check'
  ) THEN
    ALTER TABLE public.service_events
      ADD CONSTRAINT service_events_event_type_check
      CHECK (event_type IN ('view','call','whatsapp','report','reached','no_answer'));
  END IF;
END $$;

-- 3) Policies: allow inserts for anon (user_id must be null) and for authenticated (must match auth.uid())
DROP POLICY IF EXISTS "Anon can insert service events" ON public.service_events;
CREATE POLICY "Anon can insert service events"
  ON public.service_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "Authenticated can insert their service events" ON public.service_events;
CREATE POLICY "Authenticated can insert their service events"
  ON public.service_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4) Trigger function: update services.last_activity_at and views_count.
CREATE OR REPLACE FUNCTION public.handle_service_event_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.services
  SET
    last_activity_at = GREATEST(COALESCE(last_activity_at, NEW.created_at), NEW.created_at),
    views_count = CASE WHEN NEW.event_type = 'view' THEN COALESCE(views_count, 0) + 1 ELSE views_count END,
    updated_at = now()
  WHERE id = NEW.service_id;

  -- Optional: provider stats bump on call (claimed providers only)
  IF NEW.event_type = 'call' AND NEW.provider_id IS NOT NULL THEN
    INSERT INTO public.provider_stats (provider_id, total_calls, updated_at)
    VALUES (NEW.provider_id, 1, now())
    ON CONFLICT (provider_id)
    DO UPDATE SET
      total_calls = public.provider_stats.total_calls + 1,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_service_event_insert ON public.service_events;
CREATE TRIGGER on_service_event_insert
  AFTER INSERT ON public.service_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_service_event_insert();

-- Note: No SELECT policies are created on purpose (reduce privacy surface). Hub reads services.last_activity_at instead.
