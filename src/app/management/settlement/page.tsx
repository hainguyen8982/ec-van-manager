'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface WeekStats {
  totalIncome: number;
  totalExpense: number;
  fixedCosts: number;
  carryForward: number;
  netProfit: number;
  driverAmount: number;
  ownerAmount: number;
  driverRatio: number;
  weekNumber: number;
  weekYear: number;
  bankLoanWeekly: number;
  parkingWeekly: number;
  reserveWeekly: number;
}

export default function SettlementPage() {
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  const getWeekInfo = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return { week_number: weekNumber, week_year: now.getFullYear() };
  };

  const loadStats = useCallback(async () => {
    const { week_number, week_year } = getWeekInfo();

    const [txRes, settingsRes, prevRes, confirmedRes] = await Promise.all([
      supabase.from('transactions').select('type, amount, is_fund_spent').eq('week_number', week_number).eq('week_year', week_year),
      supabase.from('settings').select('*').single(),
      supabase.from('weekly_settlements').select('net_profit').eq('is_confirmed', true).order('created_at', { ascending: false }).limit(1),
      supabase.from('weekly_settlements').select('id').eq('week_number', week_number).eq('week_year', week_year).eq('is_confirmed', true).maybeSingle(),
    ]);

    const transactions = txRes.data || [];
    const settings = settingsRes.data;
    const lastSettlement = prevRes.data?.[0];

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense' && !t.is_fund_spent).reduce((s, t) => s + t.amount, 0);

    const bankLoanWeekly = settings ? Math.round(settings.bank_loan_monthly / 4) : 0;
    const parkingWeekly = settings ? Math.round(settings.parking_monthly / 4) : 0;
    const reserveWeekly = settings ? Math.round(settings.reserve_monthly / 4) : 0;
    const weeklyFixed = bankLoanWeekly + parkingWeekly + reserveWeekly;

    const carryForward = lastSettlement && lastSettlement.net_profit < 0 ? Math.abs(lastSettlement.net_profit) : 0;
    const netProfit = totalIncome - totalExpense - weeklyFixed - carryForward;
    const driverRatio = settings?.driver_ratio ?? 50;
    const driverAmount = netProfit > 0 ? Math.round(netProfit * driverRatio / 100) : 0;
    const ownerAmount = netProfit > 0 ? netProfit - driverAmount : 0;

    setStats({ totalIncome, totalExpense, fixedCosts: weeklyFixed, carryForward, netProfit, driverAmount, ownerAmount, driverRatio, weekNumber: week_number, weekYear: week_year, bankLoanWeekly, parkingWeekly, reserveWeekly });
    setConfirmed(!!confirmedRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleConfirm = async () => {
    if (!stats) return;
    setConfirming(true);

    const { error } = await supabase.from('weekly_settlements').insert({
      week_number: stats.weekNumber,
      week_year: stats.weekYear,
      total_income: stats.totalIncome,
      total_expense: stats.totalExpense,
      fixed_costs: stats.fixedCosts,
      carry_forward: stats.carryForward,
      net_profit: stats.netProfit,
      driver_amount: stats.driverAmount,
      owner_amount: stats.ownerAmount,
      driver_ratio: stats.driverRatio,
      bank_loan_weekly: stats.bankLoanWeekly,
      parking_weekly: stats.parkingWeekly,
      reserve_weekly: stats.reserveWeekly,
      is_confirmed: true,
      confirmed_at: new Date().toISOString(),
    });

    if (!error) {
      setConfirmed(true);
      router.refresh();
    }
    setConfirming(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</div>;
  if (!stats) return null;

  const now = new Date();

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Chốt sổ Hàng tuần</h2>

      <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', fontSize: '1rem' }}>
          Tuần {stats.weekNumber} / {stats.weekYear} — {now.toLocaleDateString('vi-VN')}
        </h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Tổng doanh thu:</span>
          <span style={{ color: 'var(--success)' }}>+ {fmt(stats.totalIncome)} đ</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Chi phí vận hành:</span>
          <span style={{ color: 'var(--danger)' }}>- {fmt(stats.totalExpense)} đ</span>
        </div>
        <div style={{ marginBottom: '0.5rem', borderTop: '1px dashed var(--glass-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>↳ Quỹ ngân hàng/tuần:</span>
            <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>- {fmt(stats.bankLoanWeekly)} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>↳ Quỹ bãi xe/tuần:</span>
            <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>- {fmt(stats.parkingWeekly)} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>↳ Quỹ dự phòng/tuần:</span>
            <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>- {fmt(stats.reserveWeekly)} đ</span>
          </div>
        </div>
        {stats.carryForward > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Nợ kỳ trước:</span>
            <span style={{ color: 'var(--danger)' }}>- {fmt(stats.carryForward)} đ</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', marginTop: '0.5rem' }}>
          <strong style={{ fontSize: '1.1rem', color: stats.netProfit >= 0 ? 'var(--primary)' : 'var(--danger)' }}>LỢI NHUẬN RÒNG:</strong>
          <strong style={{ fontSize: '1.1rem', color: stats.netProfit >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
            {stats.netProfit >= 0 ? '' : '- '}{fmt(Math.abs(stats.netProfit))} đ
          </strong>
        </div>
      </div>

      {stats.netProfit > 0 && (
        <div className="glass-panel" style={{ marginBottom: '1.5rem', border: '1px solid var(--success)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--success)', fontSize: '1rem' }}>Phân bổ Lợi nhuận ròng</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tiền lãi chia cho Góc Đầu Tư (Bạn):</span>
            <strong style={{ color: 'var(--success)' }}>{fmt(stats.ownerAmount)} đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tiền lãi chia cho Góc Vận Hành (Đối tác):</span>
            <strong>{fmt(stats.driverAmount)} đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--glass-border)', paddingTop: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Các khoản Quỹ Đối tác giữ để đóng:</span>
            <strong style={{ color: 'var(--warning)' }}>{fmt(stats.fixedCosts)} đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '2px solid var(--primary)', paddingTop: '1rem' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>👉 SỐ TIỀN ĐỐI TÁC CẦN CHUYỂN CHO BẠN:</span>
            <strong style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>{fmt(stats.ownerAmount)} đ</strong>
          </div>
        </div>
      )}

      {stats.netProfit < 0 && (
        <div className="glass-panel" style={{ marginBottom: '1.5rem', border: '1px solid var(--danger)' }}>
          <p style={{ color: 'var(--warning)' }}>⚠️ Tuần này lợi nhuận âm. Khoản thiếu <strong>{fmt(Math.abs(stats.netProfit))} đ</strong> sẽ được cộng vào tuần sau.</p>
        </div>
      )}

      {confirmed ? (
        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <p style={{ color: 'var(--success)', fontWeight: 600 }}>✅ Tuần này đã được chốt sổ!</p>
        </div>
      ) : (
        <>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={confirming}
            style={{ width: '100%', padding: '16px', fontSize: '1.1rem', opacity: confirming ? 0.7 : 1 }}
          >
            {confirming ? 'Đang xử lý...' : 'XÁC NHẬN CHỐT SỔ TUẦN NÀY'}
          </button>
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Hành động này sẽ khóa giao dịch tuần và lưu lại lịch sử.
          </p>
        </>
      )}
    </div>
  );
}
