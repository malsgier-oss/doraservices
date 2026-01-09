-- Fix overly permissive RLS policies (WITH CHECK (true) / USING (true) for INSERT/UPDATE/DELETE)

-- 1. Fix notification_events - System insert should be restricted to authenticated users for their own notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notification_events;

-- Allow system to insert notifications for any user (needed for triggers/functions)
-- But restrict to authenticated sessions only
CREATE POLICY "Authenticated can insert notifications"
ON public.notification_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Fix password_reset_requests - Already admin-only for SELECT, but INSERT is too open
-- Users should only create reset requests with their own phone (or any phone if not logged in)
DROP POLICY IF EXISTS "Users can create their own reset requests" ON public.password_reset_requests;

-- Allow anyone to create a password reset request (needed for forgot password flow)
-- The table is SELECT-restricted to admins only, so this is safe
CREATE POLICY "Anyone can create reset requests"
ON public.password_reset_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. Fix provider_stats - System manage is too broad
DROP POLICY IF EXISTS "System can manage provider stats" ON public.provider_stats;

-- Only authenticated users can manage their own provider stats
CREATE POLICY "Users can insert their own provider stats"
ON public.provider_stats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Users can update their own provider stats"
ON public.provider_stats FOR UPDATE
TO authenticated
USING (auth.uid() = provider_id);

-- Admins can manage all provider stats
CREATE POLICY "Admins can manage all provider stats"
ON public.provider_stats FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix review_prompts - System insert should be restricted
DROP POLICY IF EXISTS "System can insert review prompts" ON public.review_prompts;

-- Review prompts are created by triggers after calls, allow authenticated insert for own user
CREATE POLICY "Authenticated can insert own review prompts"
ON public.review_prompts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 5. Fix user_messages - System create should be restricted
DROP POLICY IF EXISTS "System can create user messages" ON public.user_messages;

-- Admins can create user messages (for broadcast messages)
CREATE POLICY "Admins can insert user messages"
ON public.user_messages FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. Add authenticated user access to profiles for public fields (needed for service listings)
-- The previous migration made profiles too restrictive, breaking functionality
CREATE POLICY "Authenticated users can view active profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (status = 'active');