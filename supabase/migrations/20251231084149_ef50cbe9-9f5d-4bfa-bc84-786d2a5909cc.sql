-- Create services table for service providers
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table for syncing between users and providers
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  description TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Services policies
CREATE POLICY "Services are viewable by everyone" 
ON public.services FOR SELECT USING (true);

CREATE POLICY "Users can create their own services" 
ON public.services FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own services" 
ON public.services FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own services" 
ON public.services FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Bookings policies - users can see their own bookings
CREATE POLICY "Users can view their bookings" 
ON public.bookings FOR SELECT USING (auth.uid() = user_id);

-- Providers can see bookings for their services
CREATE POLICY "Providers can view their service bookings" 
ON public.bookings FOR SELECT USING (auth.uid() = provider_id);

-- Users can create bookings
CREATE POLICY "Users can create bookings" 
ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookings (cancel)
CREATE POLICY "Users can update their bookings" 
ON public.bookings FOR UPDATE USING (auth.uid() = user_id);

-- Providers can update bookings (accept, complete, add notes)
CREATE POLICY "Providers can update their service bookings" 
ON public.bookings FOR UPDATE USING (auth.uid() = provider_id);

-- Triggers for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Remove points and tier columns from profiles (they will just be ignored in queries)
-- We don't drop columns to avoid breaking existing data