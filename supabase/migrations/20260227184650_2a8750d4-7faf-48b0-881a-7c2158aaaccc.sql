
-- Remove overly permissive anon policy
DROP POLICY "Public can lookup profile by username for login" ON public.profiles;
