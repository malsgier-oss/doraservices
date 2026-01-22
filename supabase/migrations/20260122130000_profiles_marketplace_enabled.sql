-- Add a profile flag to enable user marketplace dashboard/listings tools.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'marketplace_enabled'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN marketplace_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

