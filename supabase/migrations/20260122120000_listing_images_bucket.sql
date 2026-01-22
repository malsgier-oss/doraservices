-- Storage bucket + policies for personal listing images
-- Path convention: listings/{user_id}/{listing_id}/{image_id}.{ext}

INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read objects in this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Listing images are publicly accessible'
  ) THEN
    CREATE POLICY "Listing images are publicly accessible"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'listing-images');
  END IF;
END $$;

-- Authenticated users can upload/update/delete only in their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload listing images'
  ) THEN
    CREATE POLICY "Users can upload listing images"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'listing-images'
        AND (storage.foldername(name))[1] = 'listings'
        AND auth.uid()::text = (storage.foldername(name))[2]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their listing images'
  ) THEN
    CREATE POLICY "Users can update their listing images"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'listing-images'
        AND (storage.foldername(name))[1] = 'listings'
        AND auth.uid()::text = (storage.foldername(name))[2]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their listing images'
  ) THEN
    CREATE POLICY "Users can delete their listing images"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'listing-images'
        AND (storage.foldername(name))[1] = 'listings'
        AND auth.uid()::text = (storage.foldername(name))[2]
      );
  END IF;
END $$;

