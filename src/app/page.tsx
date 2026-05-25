import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the role from the public.profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // If the user role is 'partner' (driver), immediately redirect them to operations
  if (profile && profile.role === 'partner') {
    redirect('/operations');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', marginTop: '1rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem' }}>Quản lý Doanh thu</h1>
        <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem' }}>
          Hệ thống minh bạch quản lý thu chi, quỹ ngân hàng và tự động phân chia lợi nhuận.
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '1rem', marginTop: '1rem' }}>
        <Link href="/operations" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
          Góc Vận Hành (Nhập liệu)
        </Link>
        <Link href="/management" className="btn btn-glass" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
          Góc Quản Lý (Báo cáo & Cài đặt)
        </Link>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginTop: '1.5rem' }}>
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.1rem' }}>Ghi nhận Nhanh chóng</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Nhập doanh thu từ các app và các chi phí vận hành (sạc pin, cầu đường) cực nhanh trên điện thoại.</p>
        </div>
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.1rem' }}>Chốt sổ Tự động</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Tự động phân chia lợi nhuận, trích quỹ ngân hàng và quản lý nợ chuyển kỳ sau.</p>
        </div>
      </div>
    </div>
  );
}
