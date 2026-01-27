-- Add provider_mode column to profiles for toggling provider features on/off
-- When enabled, user can access provider features (services management)
-- This is separate from marketplace_enabled which controls Buy & Sell listings

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'provider_mode'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN provider_mode boolean NOT NULL DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.provider_mode IS 'When true, user has provider features enabled and can manage services. Auto-confirmed when toggled on.';
