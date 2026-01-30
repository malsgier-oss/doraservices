-- Allow admins to delete any listing (RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'listings'
      AND policyname = 'Admins can delete any listing'
  ) THEN
    CREATE POLICY "Admins can delete any listing"
      ON public.listings
      FOR DELETE
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

