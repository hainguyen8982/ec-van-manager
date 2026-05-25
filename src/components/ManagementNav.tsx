'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ManagementNav() {
  const pathname = usePathname();

  const getStyle = (path: string) => {
    const isActive = pathname === path;
    return {
      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
      textDecoration: 'none',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '4px',
      fontWeight: isActive ? 600 : 400,
      transition: 'color 0.2s ease',
    };
  };

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(11, 15, 25, 0.95)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid var(--glass-border)',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '12px 0',
      zIndex: 100
    }}>
      <Link href="/management" style={getStyle('/management')}>
        <span style={{ fontSize: '1.2rem' }}>📊</span>
        <span style={{ fontSize: '0.8rem' }}>Tổng quan</span>
      </Link>
      <Link href="/management/settlement" style={getStyle('/management/settlement')}>
        <span style={{ fontSize: '1.2rem' }}>🤝</span>
        <span style={{ fontSize: '0.8rem' }}>Chốt sổ</span>
      </Link>
      <Link href="/management/settings" style={getStyle('/management/settings')}>
        <span style={{ fontSize: '1.2rem' }}>⚙️</span>
        <span style={{ fontSize: '0.8rem' }}>Cấu hình</span>
      </Link>
    </nav>
  );
}
