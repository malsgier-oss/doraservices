-- Create service_reviews table
CREATE TABLE public.service_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, user_id)
);

-- Enable RLS
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Reviews are viewable by everyone"
ON public.service_reviews
FOR SELECT
USING (true);

-- Users can create reviews (one per service)
CREATE POLICY "Users can create reviews"
ON public.service_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.service_reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
ON public.service_reviews
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_service_reviews_service_id ON public.service_reviews(service_id);
CREATE INDEX idx_service_reviews_provider_id ON public.service_reviews(provider_id);

-- Add trigger for updated_at
CREATE TRIGGER update_service_reviews_updated_at
BEFORE UPDATE ON public.service_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();