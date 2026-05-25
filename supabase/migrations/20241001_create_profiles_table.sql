-- Create profiles table to store user roles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY,          -- Supabase auth user ID
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('owner', 'partner')),
    created_at timestamp with time zone DEFAULT now()
);

-- Index for quick lookup by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
