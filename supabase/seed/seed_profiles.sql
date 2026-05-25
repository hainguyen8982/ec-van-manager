-- Insert an initial owner for testing
INSERT INTO public.profiles (id, email, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'kingstars009@gmail.com', 'owner')
ON CONFLICT (id) DO NOTHING;

