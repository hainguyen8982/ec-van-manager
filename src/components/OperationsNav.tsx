'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function OperationsNav() {
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
      <Link href="/operations" style={getStyle('/operations')}>
        <span style={{ fontSize: '1.2rem' }}>💰</span>
        <span style={{ fontSize: '0.7rem' }}>Thu nhập</span>
      </Link>
      <Link href="/operations/expense" style={getStyle('/operations/expense')}>
        <span style={{ fontSize: '1.2rem' }}>⛽</span>
        <span style={{ fontSize: '0.7rem' }}>Chi phí</span>
      </Link>
      <Link href="/operations/overview" style={getStyle('/operations/overview')}>
        <span style={{ fontSize: '1.2rem' }}>📊</span>
        <span style={{ fontSize: '0.7rem' }}>Tổng quan</span>
      </Link>
      <Link href="/operations/settlement" style={getStyle('/operations/settlement')}>
        <span style={{ fontSize: '1.2rem' }}>🤝</span>
        <span style={{ fontSize: '0.7rem' }}>Chốt sổ</span>
      </Link>
      <Link href="/operations/fund" style={getStyle('/operations/fund')}>
        <span style={{ fontSize: '1.2rem' }}>💸</span>
        <span style={{ fontSize: '0.7rem' }}>Góp quỹ</span>
      </Link>
    </nav>
  );
}
