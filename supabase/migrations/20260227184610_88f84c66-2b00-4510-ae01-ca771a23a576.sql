
-- Allow unauthenticated users to lookup email/status by username (needed for login flow)
CREATE POLICY "Public can lookup profile by username for login"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);
