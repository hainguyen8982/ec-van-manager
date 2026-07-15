'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import RevenueChart from '@/components/RevenueChart';

interface WeekStats {
  totalIncome: number;
  totalExpense: number;
  fixedCosts: number;
  carryForward: number;
  netProfit: number;
  driverAmount: number;
  ownerAmount: number;
  driverRatio: number;
  // Lũy kế theo app
  allTimeGrab: number;
  allTimeAhamove: number;
  allTimeLalamove: number;
  allTimeOther: number;
  allTimeIncome: number;
  // Hiệu suất sạc
  allTimeCharge: number;
  chargeEfficiency: number;
  // Quỹ Ngân Hàng
  bankDeposited: number;
  bankSpent: number;
  bankBalance: number;
  bankHistory: any[];

  // Quỹ Bãi Xe
  parkingDeposited: number;
  parkingSpent: number;
  parkingBalance: number;
  parkingHistory: any[];

  // Quỹ dự phòng
  reserveDeposited: number;
  reserveSpent: number;
  reserveBalance: number;
  reserveHistory: any[];
  // Đếm số đơn theo app
  allTimeGrabCount: number;
  allTimeAhamoveCount: number;
  allTimeLalamoveCount: number;
  allTimeOtherCount: number;
  // Lợi nhuận lũy kế
  cumulativeOperations: number;
  cumulativeInvestment: number;
  // Lịch sử chốt sổ
  settlementHistory: any[];
  // Góp quỹ từ quỹ
  fundContributions: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  appStatsList: {
    id: string;
    name: string;
    income: number;
    count: number;
    color: string;
  }[];
}


export default function OperationsOverview() {
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'week' | 'alltime'>('week');
  const [showReserveDetails, setShowReserveDetails] = useState(false);
  const [expandedFund, setExpandedFund] = useState<string | null>(null);
  const supabase = createClient();

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  const loadDashboard = useCallback(async () => {

    const [txRes, settingsRes, settlementsRes] = await Promise.all([
      supabase.from('transactions').select('*').order('transaction_date', { ascending: false }),
      supabase.from('settings').select('*').single(),
      supabase.from('weekly_settlements').select('*').eq('is_confirmed', true).order('created_at', { ascending: false }),
    ]);

    const allTransactions = txRes.data || [];
    const settings = settingsRes.data;
    const allSettlements = settlementsRes.data || [];

    // --- Kỳ này ---
    const currentTxs = allTransactions.filter(t => !t.settlement_id);
    const totalIncome = currentTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = currentTxs.filter(t => t.type === 'expense' && !t.is_fund_spent).reduce((s, t) => s + t.amount, 0);
    
    // Tính số ngày của kỳ hiện tại
    const now = new Date();
    let startDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
    if (allSettlements.length > 0) {
      const lastSettlement = allSettlements[0];
      startDateObj = new Date(lastSettlement.end_date);
    }
    const startDay = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
    const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let days = Math.max(0, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)));

    const weeklyFixed = 0;
    const lastSettlement = allSettlements[0];
    const carryForward = lastSettlement && lastSettlement.net_profit < 0 ? Math.abs(lastSettlement.net_profit) : 0;
    const netProfit = totalIncome - totalExpense - carryForward;
    const driverRatio = settings?.driver_ratio ?? 50;
    const driverAmount = netProfit > 0 ? Math.round(netProfit * driverRatio / 100) : 0;
    const ownerAmount = netProfit > 0 ? netProfit - driverAmount : 0;

    // --- Lũy kế theo app (doanh thu và số đơn) ---
    const incomeTxs = allTransactions.filter(t => t.type === 'income');
    const revenueSources = settings?.revenue_sources || [
      { id: 'grab', name: 'Grab', color: '#00b14f' },
      { id: 'ahamove', name: 'Ahamove', color: '#ff6b00' },
      { id: 'lalamove', name: 'Lalamove', color: '#ff8b00' }
    ];

    const appStatsList = revenueSources.map((src: any) => {
      const txs = incomeTxs.filter(t => t.category === src.id);
      return {
        id: src.id,
        name: src.name,
        income: txs.reduce((s, t) => s + t.amount, 0),
        count: txs.length,
        color: src.color
      };
    });

    const knownSourceIds = revenueSources.map((s: any) => s.id);
    const otherTxs = incomeTxs.filter(t => !knownSourceIds.includes(t.category));
    const allTimeOther = otherTxs.reduce((s, t) => s + t.amount, 0);
    const allTimeOtherCount = otherTxs.length;
    const allTimeIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);

    const allTimeGrab = 0;
    const allTimeGrabCount = 0;
    const allTimeAhamove = 0;
    const allTimeAhamoveCount = 0;
    const allTimeLalamove = 0;
    const allTimeLalamoveCount = 0;

    // --- Hiệu suất sạc ---
    const allTimeCharge = allTransactions.filter(t => t.type === 'expense' && t.category === 'charge').reduce((s, t) => s + t.amount, 0);
    const chargeEfficiency = allTimeIncome > 0 ? (allTimeCharge / allTimeIncome) * 100 : 0;

    // --- 4. TÍNH TOÁN CÁC QUỸ CỐ ĐỊNH (NGÂN HÀNG, BÃI XE, DỰ PHÒNG) ---
    const bankDeposited = 0;
    const bankSpent = 0;
    const bankBalance = 0;
    const bankHistory: any[] = [];
    const parkingDeposited = 0;
    const parkingSpent = 0;
    const parkingBalance = 0;
    const parkingHistory: any[] = [];

    // Tổng trích từ các tuần chốt sổ
    const reserveDepositedConfirmed = allSettlements.reduce((s, x) => s + Number(x.reserve_weekly || 0), 0);

    // Tổng chi từ các quỹ
    const fundSpentTxs = allTransactions.filter(t => t.type === 'expense' && t.is_fund_spent);
    const reserveSpent = fundSpentTxs.reduce((s, t) => s + t.amount, 0);

    // Manual contributions
    const fundContributionsTxs = allTransactions.filter(t => t.type === 'contribution');
    const fundContributions = fundContributionsTxs.reduce((s, t) => s + t.amount, 0);

    // Tồn quỹ dự phòng = Tổng trích chốt sổ + Góp quỹ thủ công - Chi từ quỹ
    const reserveDeposited = reserveDepositedConfirmed;
    const reserveBalance = reserveDepositedConfirmed + fundContributions - reserveSpent;

    // Lịch sử chi tiết quỹ dự phòng
    const reserveDepositsFromSettlement = allSettlements
      .filter(x => Number(x.reserve_weekly || 0) > 0)
      .map(x => ({
        type: 'deposit',
        amount: Number(x.reserve_weekly),
        date: x.created_at,
        note: `Trích từ chốt sổ (Kỳ ${x.week_number || new Date(x.created_at).toLocaleDateString('vi-VN')})`,
        isIncome: true
      }));

    const reserveManualContributions = fundContributionsTxs.map(t => ({
      type: 'deposit',
      amount: t.amount,
      date: t.transaction_date || t.created_at,
      note: t.note || 'Góp quỹ (Tiền túi)',
      isIncome: true
    }));

    const reserveExpenses = fundSpentTxs.map(t => ({
      type: 'expense',
      amount: t.amount,
      date: t.transaction_date || t.created_at,
      note: t.note || 'Chi quỹ',
      isIncome: false
    }));

    const reserveHistory = [...reserveDepositsFromSettlement, ...reserveManualContributions, ...reserveExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // --- Lũy kế lợi nhuận ---
    const cumulativeOperations = allSettlements.reduce((s, x) => s + Number(x.driver_amount || 0), 0);
    const cumulativeInvestment = allSettlements.reduce((s, x) => s + Number(x.owner_amount || 0), 0);

    setStats({
      totalIncome,
      totalExpense,
      fixedCosts: weeklyFixed,
      carryForward,
      netProfit,
      driverAmount,
      ownerAmount,
      driverRatio,
      allTimeGrab,
      allTimeGrabCount,
      allTimeAhamove,
      allTimeAhamoveCount,
      allTimeLalamove,
      allTimeLalamoveCount,
      allTimeOther,
      allTimeOtherCount,
      allTimeIncome,
      appStatsList,
      allTimeCharge,
      chargeEfficiency,
      bankDeposited,
      bankSpent,
      bankBalance,
      bankHistory,
      parkingDeposited,
      parkingSpent,
      parkingBalance,
      parkingHistory,
      reserveDeposited,
      reserveSpent,
      reserveBalance,
      fundContributions,
      reserveHistory,
      cumulativeOperations,
      cumulativeInvestment,
      settlementHistory: allSettlements,
      currentPeriodStart: startDateObj.toISOString(),
      currentPeriodEnd: now.toISOString(),
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) return (
    <div className="page-transition" style={{ display: 'grid', gap: '1rem', padding: '1rem 0' }}>
      <div className="skeleton-box" style={{ height: '40px', width: '200px', marginBottom: '1rem' }}></div>
      <div className="skeleton-box" style={{ height: '120px' }}></div>
      <div className="skeleton-box" style={{ height: '120px' }}></div>
      <div className="skeleton-box" style={{ height: '120px' }}></div>
    </div>
  );
  if (!stats) return null;

  const renderAppCard = (name: string, income: number, count: number, totalIncome: number, color: string, isBest: boolean = false) => {
    const pct = totalIncome > 0 ? Math.round((income / totalIncome) * 100) : 0;
    const arpo = count > 0 ? Math.round(income / count) : 0;
    return (
      <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: `1px solid ${isBest ? 'var(--warning)' : color + '33'}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: isBest ? 'var(--warning)' : color }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong style={{ color: color }}>{name}</strong>
          <span style={{ fontSize: '0.8rem', background: `${color}22`, color: color, padding: '2px 6px', borderRadius: '4px' }}>{pct}% Tỷ trọng</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Tổng thu:</span>
          <strong style={{ color: 'var(--text-primary)' }}>{fmt(income)} đ</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', paddingBottom: '8px', borderBottom: '1px dashed var(--glass-border)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Số đơn:</span>
          <span>{count} đơn</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Bình quân/đơn:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isBest && <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>🌟 Tốt nhất</span>}
            <strong style={{ color: 'var(--success)', fontSize: '1rem' }}>{fmt(arpo)} đ</strong>
          </div>
        </div>
      </div>
    );
  };

  const chargeAdvice = () => {
    if (stats.chargeEfficiency === 0) return 'Chưa có thông tin sạc.';
    if (stats.chargeEfficiency < 15) return '⚡ Vận hành tiết kiệm điện tốt!';
    if (stats.chargeEfficiency <= 25) return '⚡ Chi phí sạc pin ở mức bình thường.';
    return '⚠️ Chi phí sạc cao (>25% doanh thu). Nên tối ưu giờ sạc hoặc kiểm tra lốp xe.';
  };

  return (
    <div className="page-transition">
      {/* Tab Header */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
        <button onClick={() => setActiveTab('week')} className={`btn ${activeTab === 'week' ? 'btn-primary' : 'btn-glass'}`} style={{ padding: '8px 16px', fontSize: '0.9rem', flex: 1 }}>
          Kỳ hiện tại
        </button>
        <button onClick={() => setActiveTab('alltime')} className={`btn ${activeTab === 'alltime' ? 'btn-primary' : 'btn-glass'}`} style={{ padding: '8px 16px', fontSize: '0.9rem', flex: 1 }}>
          Lũy kế & Báo cáo
        </button>
      </div>

      {activeTab === 'week' ? (
        <div>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Tổng quan Kỳ hiện tại</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="glass-panel" style={{ borderLeft: '4px solid var(--success)' }}>
              <p className="input-label">Tổng thu nhập</p>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--success)' }}>{fmt(stats.totalIncome)} đ</h3>
            </div>
            <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger)' }}>
              <p className="input-label">Chi phí vận hành</p>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--danger)' }}>{fmt(stats.totalExpense)} đ</h3>
            </div>

            {stats.carryForward > 0 && (
              <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger)' }}>
                <p className="input-label">Khoản nợ chuyển từ kỳ trước</p>
                <h3 style={{ fontSize: '1.8rem', color: 'var(--danger)' }}>- {fmt(stats.carryForward)} đ</h3>
              </div>
            )}
            <div className="glass-panel" style={{
              borderLeft: `4px solid ${stats.netProfit >= 0 ? 'var(--primary)' : 'var(--danger)'}`,
              background: 'linear-gradient(135deg, rgba(0,210,255,0.07) 0%, rgba(58,123,213,0.07) 100%)'
            }}>
              <p className="input-label">Lợi nhuận ròng (Tạm tính)</p>
              <h3 style={{ fontSize: '2rem', color: stats.netProfit >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                {stats.netProfit >= 0 ? '' : '- '}{fmt(Math.abs(stats.netProfit))} đ
              </h3>
              {stats.netProfit > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Góc Vận Hành ({stats.driverRatio}%)</p>
                    <p style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(stats.driverAmount)} đ</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Góc Đầu Tư ({100 - stats.driverRatio}%)</p>
                    <p style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(stats.ownerAmount)} đ</p>
                  </div>
                </div>
              )}
              {stats.netProfit < 0 && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--warning)' }}>
                  ⚠️ Kỳ này bị âm, khoản thiếu sẽ được cộng dồn sang kỳ sau.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        // TAB 2: LŨY KẾ & BÁO CÁO
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* BIỂU ĐỒ DOANH THU */}
          <RevenueChart 
            defaultStartDate={stats.currentPeriodStart} 
            defaultEndDate={stats.currentPeriodEnd} 
          />

          {/* QUÂN LÝ CÁC QUỸ (chỉ xem, không chỉnh) */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--warning)' }}>Quản lý Các Quỹ (Ngân hàng, Bãi xe, Dự phòng)</h3>
            
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>


              {/* Quỹ Dự Phòng */}
              <div 
                onClick={() => setExpandedFund(expandedFund === 'reserve' ? null : 'reserve')}
                style={{ cursor: 'pointer', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: expandedFund === 'reserve' ? '1px solid var(--primary)' : '1px solid var(--glass-border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🔧 Quỹ Dự phòng
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Trích: +{fmt(stats.reserveDeposited)} | Chi: -{fmt(stats.reserveSpent)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Số dư</p>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', color: stats.reserveBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(stats.reserveBalance)}</p>
                  </div>
                </div>
                {expandedFund === 'reserve' && (
                  <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--glass-border)', paddingTop: '0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Chi tiết giao dịch:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {stats.reserveHistory.length > 0 ? stats.reserveHistory.map((item: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 8px', background: 'rgba(0,0,0,0.15)', borderRadius: '4px' }}>
                          <div>
                            <span style={{ color: item.isIncome ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>{item.isIncome ? 'Nạp quỹ' : 'Chi quỹ'}</span>
                            <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({new Date(item.date).toLocaleDateString('vi-VN')})</span>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>{item.note}</p>
                          </div>
                          <strong style={{ color: item.isIncome ? 'var(--success)' : 'var(--danger)' }}>{item.isIncome ? '+' : '-'}{fmt(item.amount)}</strong>
                        </div>
                      )) : <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Chưa có giao dịch.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>


          
          {/* LỢI NHUẬN LŨY KẾ */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Lợi nhuận Lũy kế đã chia (All-time)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nguyễn Trường Hải (Đầu tư)</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{fmt(stats.cumulativeInvestment)} đ</p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                 <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nguyễn Hải Duy (Vận hành)</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>{fmt(stats.cumulativeOperations)} đ</p>
              </div>
            </div>
          </div>

          {/* DOANH THU THEO APP */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--success)' }}>Phân tích Doanh thu theo App</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lũy kế All-time</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              {(() => {
                const apps = [
                  ...(stats.appStatsList || []),
                  { name: 'Ứng dụng khác', income: stats.allTimeOther, count: stats.allTimeOtherCount, color: 'var(--primary)' }
                ];
                
                const validApps = apps.filter(a => a.count > 0 || a.name !== 'Ứng dụng khác');
                const arpos = validApps.map(a => a.count > 0 ? a.income / a.count : 0);
                const maxArpo = Math.max(...arpos);
                
                return validApps.map(a => renderAppCard(
                  a.name, 
                  a.income, 
                  a.count, 
                  stats.allTimeIncome, 
                  a.color, 
                  maxArpo > 0 && (a.count > 0 ? a.income / a.count : 0) === maxArpo
                ));
              })()}
            </div>
          </div>

          {/* HIỆU SUẤT SẠC */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>⚡ Hiệu suất Sạc pin</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Tổng tiền sạc điện:</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--warning)' }}>{fmt(stats.allTimeCharge)} đ</strong>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>Tỷ lệ chi phí sạc / doanh thu</span>
                <span style={{ color: 'var(--text-secondary)' }}>{stats.allTimeIncome > 0 ? Math.round((stats.allTimeCharge / stats.allTimeIncome) * 100) : 0}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.allTimeIncome > 0 ? Math.round((stats.allTimeCharge / stats.allTimeIncome) * 100) : 0}%`, height: '100%', background: 'var(--warning)', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: stats.chargeEfficiency > 25 ? 'var(--danger)' : 'var(--success)', lineHeight: 1.4, marginTop: '0.5rem' }}>
              {chargeAdvice()}
            </p>
          </div>
        {/* LỊCH SỬ CHỐT */}
        <div className="glass-panel">
          <h3 style={{fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)'}}>Lịch sử chốt</h3>
          <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Chưa có dữ liệu lịch sử chốt.</p>
        </div>


        </div>
      )}
    </div>
  );
}
