'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  userEmail?: string;
}

export default function LogoutButton({ userEmail }: Props) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {userEmail && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {userEmail}
        </span>
      )}
      <button
        onClick={handleLogout}
        disabled={loading}
        className="btn btn-glass"
        style={{ padding: '8px 14px', fontSize: '0.85rem' }}
      >
        {loading ? '...' : 'Đăng xuất'}
      </button>
    </div>
  );
}
