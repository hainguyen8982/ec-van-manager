import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ManagementNav from '@/components/ManagementNav';

export default async function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's role from public.profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // If the user profile doesn't exist yet or is not owner, redirect to operations page
  if (!profile || profile.role !== 'owner') {
    redirect('/operations');
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      {children}
      <ManagementNav />
    </div>
  );
}
