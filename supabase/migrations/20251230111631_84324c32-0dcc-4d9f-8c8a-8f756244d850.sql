-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Businesses RLS policies
CREATE POLICY "Businesses are viewable by everyone" 
ON public.businesses FOR SELECT USING (true);

CREATE POLICY "Users can create their own business" 
ON public.businesses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business" 
ON public.businesses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business" 
ON public.businesses FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for businesses updated_at
CREATE TRIGGER update_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create deals table
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on deals
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Deals RLS policies
CREATE POLICY "Deals are viewable by everyone" 
ON public.deals FOR SELECT USING (true);

CREATE POLICY "Business owners can create deals" 
ON public.deals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business owners can update their deals" 
ON public.deals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Business owners can delete their deals" 
ON public.deals FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for deals updated_at
CREATE TRIGGER update_deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create posts table for community feed
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Posts RLS policies
CREATE POLICY "Posts are viewable by everyone" 
ON public.posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" 
ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON public.posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for posts updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add bio column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add is_business_owner column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_business_owner BOOLEAN NOT NULL DEFAULT false;