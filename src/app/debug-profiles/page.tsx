import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DebugProfilesPage() {
  const supabase = await createClient();
  
  // Fetch profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');
    
  // Fetch settings
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('*');

  // Fetch current user
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Màn hình Debug Cơ sở dữ liệu</h1>
      
      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <h3>Thông tin User đang đăng nhập hiện tại:</h3>
        <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
          {JSON.stringify(user ? { id: user.id, email: user.email } : 'Chưa đăng nhập', null, 2)}
        </pre>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <h3>Danh sách trong bảng `profiles`:</h3>
        <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
          {JSON.stringify(profiles || { error: profilesError }, null, 2)}
        </pre>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <h3>Danh sách trong bảng `settings`:</h3>
        <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
          {JSON.stringify(settings || { error: settingsError }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
