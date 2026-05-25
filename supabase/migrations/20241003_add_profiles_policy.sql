-- Enable select policy for profiles so users can read their own profile
CREATE POLICY "Allow users to read their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
