import type { Metadata } from 'next';
import './globals.css';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'EC-Van Manager',
  description: 'Quản lý thu chi và chia sẻ lợi nhuận xe VinFast EC-Van',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="vi">
      <body>
        <header className="main-header">
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '1px', textDecoration: 'none', color: 'inherit' }}>
            <span className="text-primary">EC-Van</span> Manager
          </Link>
          <nav>
            {user ? (
              <LogoutButton userEmail={user.email} />
            ) : (
              <a href="/login" className="btn btn-glass" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                Đăng nhập
              </a>
            )}
          </nav>
        </header>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
