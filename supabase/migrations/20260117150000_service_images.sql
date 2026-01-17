-- Dora P0: Service images (free tier: up to 5 images per service)

-- 1) Table
CREATE TABLE IF NOT EXISTS public.service_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  -- Public URL for the image (convenient for clients)
  url TEXT NOT NULL,
  -- Storage object path (optional but useful for deletion/cleanup)
  storage_path TEXT,
  -- 1..5 (position 1 is the cover image)
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_images_position_range CHECK (position BETWEEN 1 AND 5),
  CONSTRAINT service_images_unique_position UNIQUE (service_id, position)
);

ALTER TABLE public.service_images ENABLE ROW LEVEL SECURITY;

-- 2) RLS
-- Public read is allowed (services are already public-readable in this repo).
CREATE POLICY "Service images are viewable by everyone"
ON public.service_images
FOR SELECT
USING (true);

-- Providers can manage images for services they own.
CREATE POLICY "Providers can insert images for their services"
ON public.service_images
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_id
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update images for their services"
ON public.service_images
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_id
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete images for their services"
ON public.service_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_id
      AND s.user_id = auth.uid()
  )
);

-- 3) Triggers
DROP TRIGGER IF EXISTS update_service_images_updated_at ON public.service_images;
CREATE TRIGGER update_service_images_updated_at
BEFORE UPDATE ON public.service_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_service_images_service_pos
  ON public.service_images(service_id, position);

-- 4) Storage bucket + policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read objects in this bucket
CREATE POLICY "Service images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'service-images');

-- Providers can upload/update/delete only in their folder AND only for their own service
-- Expected path: {user_id}/{service_id}/{image_id}.{ext}

CREATE POLICY "Providers can upload service images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'service-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id::text = (storage.foldername(name))[2]
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their service images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'service-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id::text = (storage.foldername(name))[2]
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete their service images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'service-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id::text = (storage.foldername(name))[2]
      AND s.user_id = auth.uid()
  )
);
