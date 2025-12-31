-- Add city column to profiles table for provider location
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT NULL;