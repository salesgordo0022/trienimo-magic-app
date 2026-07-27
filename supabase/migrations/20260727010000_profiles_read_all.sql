DROP POLICY IF EXISTS "profiles read" ON public.profiles;
CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated
  USING (true);
