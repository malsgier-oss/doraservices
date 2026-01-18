-- Dora: allow users to delete their own notification rows, and allow admins
-- to read service_events for analytics.

-- 1) user_messages: users can delete their own notification records
DROP POLICY IF EXISTS "Users can delete their messages" ON public.user_messages;
CREATE POLICY "Users can delete their messages"
  ON public.user_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2) service_events: admin-only read (needed for dashboard analytics)
DROP POLICY IF EXISTS "Admins can read service events" ON public.service_events;
CREATE POLICY "Admins can read service events"
  ON public.service_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
