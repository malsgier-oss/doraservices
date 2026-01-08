-- Allow anonymous users to read approved provider profiles for public featured listings
CREATE POLICY "Public can view approved provider profiles"
ON public.profiles FOR SELECT
TO anon
USING (provider_status = 'approved');
