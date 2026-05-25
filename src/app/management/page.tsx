'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DashboardStats {
  // Tuần này
  totalIncome: number;
  totalExpense: number;
  fixedCosts: number;
  carryForward: number;
  netProfit: number;
  driverAmount: number;
  ownerAmount: number;
  driverRatio: number;

  // Lũy kế doanh thu app
  allTimeGrab: number;
  allTimeAhamove: number;
  allTimeLalamove: number;
  allTimeOther: number;
  allTimeIncome: number;
  allTimeGrabOrders: number;
  allTimeAhamoveOrders: number;
  allTimeLalamoveOrders: number;
  allTimeOtherOrders: number;

  // Hiệu suất sạc
  allTimeCharge: number;
  chargeEfficiency: number;

  // Quản lý các quỹ
  bankDeposited: number;
  bankSpent: number;
  bankBalance: number;

  parkingDeposited: number;
  parkingSpent: number;
  parkingBalance: number;

  reserveDeposited: number;
  reserveSpent: number;
  reserveBalance: number;

  fundHistory: any[];

  // Lũy kế lợi nhuận đã chia
  cumulativeOwner: number;
  cumulativeDriver: number;

  // Cảnh báo bảo dưỡng
  weeksSinceRepair: number;
  latestRepairDate: string;
  needsMaintenance: boolean;
  isFundLow: boolean;
  minFundLimit: number;
  intervalLimitWeeks: number;

  // Data for historical view
  allTransactions: any[];
  expenseCategories: any[];
  revenueSources: any[];
  settlementHistory: any[];
}

export default function ManagementDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'week' | 'alltime'>('week');
  const [showReserveDetails, setShowReserveDetails] = useState(false);
  const supabase = createClient();

  const [expandedSettlementId, setExpandedSettlementId] = useState<string | null>(null);

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  const loadDashboard = useCallback(async () => {
    // Tải tất cả các bản ghi để phục vụ tính lũy kế
    const [txRes, settingsRes, settlementsRes] = await Promise.all([
      supabase.from('transactions').select('*').order('transaction_date', { ascending: false }),
      supabase.from('settings').select('*').single(),
      supabase.from('weekly_settlements').select('*').eq('is_confirmed', true).order('created_at', { ascending: false }),
    ]);

    const allTransactions = txRes.data || [];
    const settings = settingsRes.data;
    const allSettlements = settlementsRes.data || [];

    // --- 1. TÍNH TOÁN CHO KỲ HIỆN TẠI ---
    const currentTxs = allTransactions.filter(t => !t.settlement_id);
    const totalIncome = currentTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    // Lưu ý: chi phí vận hành tuần của tài xế không bao gồm chi phí từ quỹ dự phòng
    const totalExpense = currentTxs.filter(t => t.type === 'expense' && !t.is_fund_spent).reduce((s, t) => s + t.amount, 0);

    const now = new Date();
    let startDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
    if (allSettlements.length > 0) {
      const lastSettlement = allSettlements[0];
      startDateObj = lastSettlement.end_date ? new Date(lastSettlement.end_date) : new Date(lastSettlement.created_at);
    }
    let days = Math.ceil((now.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 1) days = 1;

    const weeklyFixed = settings
      ? (settings.is_bank_loan_active !== false ? Math.round((settings.bank_loan_monthly / 30) * days) : 0)
        + (settings.is_parking_active !== false ? Math.round((settings.parking_monthly / 30) * days) : 0)
        + (settings.is_reserve_active !== false ? Math.round((settings.reserve_monthly / 30) * days) : 0)
      : 0;

    const lastSettlement = allSettlements[0]; // Bản ghi chốt sổ gần nhất
    const carryForward = lastSettlement && lastSettlement.net_profit < 0 ? Math.abs(lastSettlement.net_profit) : 0;
    const netProfit = totalIncome - totalExpense - weeklyFixed - carryForward;
    const driverRatio = settings?.driver_ratio ?? 50;
    const driverAmount = netProfit > 0 ? Math.round(netProfit * driverRatio / 100) : 0;
    const ownerAmount = netProfit > 0 ? netProfit - driverAmount : 0;

    // --- 2. TÍNH TOÁN LŨY KẾ DOANH THU THEO APP (ALL-TIME) ---
    const allTimeIncomeTxs = allTransactions.filter(t => t.type === 'income');
    const allTimeGrab = allTimeIncomeTxs.filter(t => t.category === 'grab').reduce((s, t) => s + t.amount, 0);
    const allTimeAhamove = allTimeIncomeTxs.filter(t => t.category === 'ahamove').reduce((s, t) => s + t.amount, 0);
    const allTimeLalamove = allTimeIncomeTxs.filter(t => t.category === 'lalamove').reduce((s, t) => s + t.amount, 0);
    const allTimeOther = allTimeIncomeTxs.filter(t => !['grab', 'ahamove', 'lalamove'].includes(t.category)).reduce((s, t) => s + t.amount, 0);
    const allTimeIncome = allTimeGrab + allTimeAhamove + allTimeLalamove + allTimeOther;

    // --- 3. TÍNH TOÁN HIỆU SUẤT SẠC PIN (ALL-TIME) ---
    const allTimeCharge = allTransactions.filter(t => t.type === 'expense' && t.category === 'charge').reduce((s, t) => s + t.amount, 0);
    const chargeEfficiency = allTimeIncome > 0 ? (allTimeCharge / allTimeIncome) * 100 : 0;

    // --- 4. TÍNH TOÁN CÁC QUỸ CỐ ĐỊNH (NGÂN HÀNG, BÃI XE, DỰ PHÒNG) ---
    // Tổng trích từ các tuần chốt sổ
    const bankDeposited = allSettlements.reduce((s, x) => s + Number(x.bank_loan_weekly || 0), 0);
    const parkingDeposited = allSettlements.reduce((s, x) => s + Number(x.parking_weekly || 0), 0);
    const reserveDeposited = allSettlements.reduce((s, x) => s + Number(x.reserve_weekly || 0), 0);

    // Tổng chi từ các quỹ
    const fundSpentTxs = allTransactions.filter(t => t.type === 'expense' && t.is_fund_spent);
    
    const bankSpent = fundSpentTxs.filter(t => t.category === 'bank').reduce((s, t) => s + t.amount, 0);
    const parkingSpent = fundSpentTxs.filter(t => t.category === 'parking').reduce((s, t) => s + t.amount, 0);
    const reserveSpent = fundSpentTxs.filter(t => t.category !== 'bank' && t.category !== 'parking').reduce((s, t) => s + t.amount, 0);

    // Tồn quỹ
    const bankBalance = bankDeposited - bankSpent;
    const parkingBalance = parkingDeposited - parkingSpent;
    const reserveBalance = reserveDeposited - reserveSpent;

    // --- 5. TÍNH LŨY KẾ LỢI NHUẬN ĐÃ CHIA ---
    const cumulativeOwner = allSettlements.reduce((s, x) => s + Number(x.owner_amount || 0), 0);
    const cumulativeDriver = allSettlements.reduce((s, x) => s + Number(x.driver_amount || 0), 0);

    // --- 6. CẢNH BÁO BẢO DƯỠNG ---
    const repairTxs = allTransactions.filter(t => t.type === 'expense' && t.category === 'repair');
    let weeksSinceRepair = 0;
    let latestRepairDate = 'Chưa bảo dưỡng';
    if (repairTxs.length > 0) {
      // Sắp xếp ngày mới nhất lên đầu
      repairTxs.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      const latestRepair = repairTxs[0];
      latestRepairDate = new Date(latestRepair.transaction_date).toLocaleDateString('vi-VN');
      const diffMs = new Date().getTime() - new Date(latestRepair.transaction_date).getTime();
      weeksSinceRepair = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    } else if (allSettlements.length > 0) {
      // Nếu chưa bao giờ sửa chữa, tính mốc từ tuần chốt sổ đầu tiên
      allSettlements.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const diffMs = new Date().getTime() - new Date(allSettlements[0].created_at).getTime();
      weeksSinceRepair = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    }

    const intervalLimitWeeks = settings?.maintenance_interval_weeks ?? 12;
    const minFundLimit = settings?.maintenance_min_fund ?? 2000000;

    const needsMaintenance = weeksSinceRepair >= intervalLimitWeeks;
    const isFundLow = reserveBalance < minFundLimit;

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
      allTimeAhamove,
      allTimeLalamove,
      allTimeOther,
      allTimeIncome,
      allTimeCharge,
      chargeEfficiency,
      bankDeposited,
      bankSpent,
      bankBalance,
      parkingDeposited,
      parkingSpent,
      parkingBalance,
      reserveDeposited,
      reserveSpent,
      reserveBalance,
      fundHistory: fundSpentTxs.slice(0, 10), // 10 khoản chi quỹ gần nhất
      cumulativeOwner,
      cumulativeDriver,
      weeksSinceRepair,
      latestRepairDate,
      needsMaintenance,
      isFundLow,
      minFundLimit,
      intervalLimitWeeks,
      settlementHistory: allSettlements,
      allTransactions,
      expenseCategories: settings?.expense_categories || [],
      revenueSources: settings?.revenue_sources || [],
      // New order count fields
      allTimeGrabOrders: allTimeIncomeTxs.filter(t => t.type === 'income' && t.category === 'grab').length,
      allTimeAhamoveOrders: allTimeIncomeTxs.filter(t => t.type === 'income' && t.category === 'ahamove').length,
      allTimeLalamoveOrders: allTimeIncomeTxs.filter(t => t.type === 'income' && t.category === 'lalamove').length,
      allTimeOtherOrders: allTimeIncomeTxs.filter(t => t.type === 'income' && !['grab', 'ahamove', 'lalamove'].includes(t.category)).length,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</div>;
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

  const getChargeAdvice = (percent: number) => {
    if (percent === 0) return 'Chưa có thông tin sạc.';
    if (percent < 15) return '⚡ Vận hành tiết kiệm điện tốt! Chi phí sạc thấp tối ưu.';
    if (percent <= 25) return '⚡ Chi phí sạc pin bình thường. Hãy tiếp tục tối ưu hóa giờ sạc pin.';
    return '⚠️ Chi phí sạc cao (>25% doanh thu). Nên kiểm tra lại áp suất lốp, cách vận hành hoặc sạc ở khung giờ rẻ hơn.';
  };

  const getCategoryName = (id: string, isIncome: boolean) => {
    if (isIncome) {
      const src = stats.revenueSources.find((s: any) => s.id === id);
      return src ? src.name : id;
    } else {
      const cat = stats.expenseCategories.find((c: any) => c.id === id);
      return cat ? `${cat.icon} ${cat.name}` : id;
    }
  };

  return (
    <div>
      {/* Tab Header */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('week')}
          className={`btn ${activeTab === 'week' ? 'btn-primary' : 'btn-glass'}`}
          style={{ padding: '8px 16px', fontSize: '0.9rem', flex: 1 }}
        >
          Kỳ hiện tại
        </button>
        <button
          onClick={() => setActiveTab('alltime')}
          className={`btn ${activeTab === 'alltime' ? 'btn-primary' : 'btn-glass'}`}
          style={{ padding: '8px 16px', fontSize: '0.9rem', flex: 1 }}
        >
          Lũy kế & Báo cáo
        </button>
      </div>

      {activeTab === 'week' ? (
        // TAB 1: KỲ HIỆN TẠI
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

            <div className="glass-panel" style={{ borderLeft: '4px solid var(--warning)' }}>
              <p className="input-label">Quỹ cố định kỳ này (Ngân hàng, Bãi xe, Dự phòng)</p>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--warning)' }}>{fmt(stats.fixedCosts)} đ</h3>
            </div>

            {stats.carryForward > 0 && (
              <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger)' }}>
                <p className="input-label">Nợ chuyển từ kỳ trước</p>
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
          
          {/* CẢNH BÁO BẢO DƯỠNG & QUỸ */}
          {(stats.needsMaintenance || stats.isFundLow) && (
            <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(239,68,68,0.05)' }}>
              <h3 style={{ color: 'var(--danger)', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>⚠️ CẢNH BÁO HỆ THỐNG</h3>
              {stats.needsMaintenance && (
                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                  • Xe đã đi hoạt động <strong>{stats.weeksSinceRepair} tuần</strong> kể từ lần bảo dưỡng/sửa chữa gần nhất ({stats.latestRepairDate}). Quá chu kỳ cài đặt ({stats.intervalLimitWeeks} tuần). Vui lòng mang xe đi bảo dưỡng định kỳ!
                </p>
              )}
              {stats.isFundLow && (
                <p style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>
                  • Số dư Quỹ dự phòng hiện tại (<strong>{fmt(stats.reserveBalance)} đ</strong>) đang thấp hơn ngưỡng an toàn của xe (<strong>{fmt(stats.minFundLimit)} đ</strong>). Hãy tích lũy thêm trước khi thực hiện các chi tiêu lớn!
                </p>
              )}
            </div>
          )}

          {/* 1. QUẢN LÝ CÁC QUỸ */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--warning)' }}>Quản lý Các Quỹ (Ngân hàng, Bãi xe, Dự phòng)</h3>
            
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
              {/* Quỹ Ngân Hàng */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>🏦 Quỹ Ngân hàng</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Trích: +{fmt(stats.bankDeposited)} | Chi: -{fmt(stats.bankSpent)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Số dư</p>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem', color: stats.bankBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(stats.bankBalance)}</p>
                </div>
              </div>

              {/* Quỹ Bãi Xe */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>🅿️ Quỹ Bãi xe</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Trích: +{fmt(stats.parkingDeposited)} | Chi: -{fmt(stats.parkingSpent)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Số dư</p>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem', color: stats.parkingBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(stats.parkingBalance)}</p>
                </div>
              </div>

              {/* Quỹ Dự Phòng */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>🔧 Quỹ Dự phòng</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Trích: +{fmt(stats.reserveDeposited)} | Chi: -{fmt(stats.reserveSpent)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Số dư</p>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem', color: stats.reserveBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(stats.reserveBalance)}</p>
                </div>
              </div>
            </div>

            {stats.fundHistory.length > 0 && (
              <button 
                onClick={() => setShowReserveDetails(!showReserveDetails)} 
                className="btn btn-glass" 
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                {showReserveDetails ? 'Ẩn chi tiết chi quỹ' : 'Xem lịch sử chi quỹ'}
              </button>
            )}

            {showReserveDetails && stats.fundHistory.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Lịch sử chi quỹ gần đây:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stats.fundHistory.map((item, idx) => {
                    let iconName = '📦 Khác';
                    if (item.category === 'repair') iconName = '🔧 Sửa chữa';
                    if (item.category === 'bank') iconName = '🏦 Ngân hàng';
                    if (item.category === 'parking') iconName = '🅿️ Bãi xe';
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                        <div>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{iconName}</span>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({new Date(item.transaction_date).toLocaleDateString('vi-VN')})</span>
                          {item.note && <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>{item.note}</p>}
                        </div>
                        <strong style={{ color: 'var(--danger)' }}>-{fmt(item.amount)} đ</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. LỢI NHUẬN LŨY KẾ ĐÃ CHIA */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Lợi nhuận Lũy kế đã chia (All-time)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nguyễn Trường Hải (Đầu tư)</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{fmt(stats.cumulativeOwner)} đ</p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nguyễn Hải Duy (Vận hành)</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>{fmt(stats.cumulativeDriver)} đ</p>
              </div>
            </div>
          </div>

          {/* 3. DOANH THU CHI TIẾT THEO APP */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--success)' }}>Phân tích Doanh thu theo App</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lũy kế All-time</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              {(() => {
                const apps = [
                  { name: 'Grab', income: stats.allTimeGrab, count: stats.allTimeGrabOrders, color: '#00b14f' },
                  { name: 'Ahamove', income: stats.allTimeAhamove, count: stats.allTimeAhamoveOrders, color: '#ff6b00' },
                  { name: 'Lalamove', income: stats.allTimeLalamove, count: stats.allTimeLalamoveOrders, color: '#ff8b00' },
                  { name: 'Ứng dụng khác', income: stats.allTimeOther, count: stats.allTimeOtherOrders, color: 'var(--primary)' }
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

          {/* 4. HIỆU SUẤT SẠC PIN */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>⚡ Hiệu suất Sạc pin</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Tổng tiền sạc điện:</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--warning)' }}>{fmt(stats.allTimeCharge)} đ</strong>
            </div>
            {/* Keeping the percentage bar for charge efficiency as it makes sense here */}
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
              {getChargeAdvice(stats.chargeEfficiency)}
            </p>
          </div>

          {/* 5. LỊCH SỬ CHỐT SỔ */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Lịch sử chốt sổ các kỳ</h3>
            {stats.settlementHistory.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 4px' }}>Thời gian</th>
                      <th style={{ padding: '8px 4px' }}>Doanh thu</th>
                      <th style={{ padding: '8px 4px' }}>Chi phí</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right' }}>Lợi nhuận</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center' }}>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.settlementHistory.map((item, idx) => {
                      const isExpanded = expandedSettlementId === item.id;
                      const periodLabel = item.start_date && item.end_date
                        ? `${new Date(item.start_date).toLocaleDateString('vi-VN')} - ${new Date(item.end_date).toLocaleDateString('vi-VN')}`
                        : `Tuần ${item.week_number}/${item.week_year}`;
                      
                      const txs = stats.allTransactions.filter(t => t.settlement_id === item.id);
                      const incomes = txs.filter(t => t.type === 'income');
                      const expenses = txs.filter(t => t.type === 'expense' && !t.is_fund_spent);
                      const funds = txs.filter(t => t.type === 'expense' && t.is_fund_spent);
                      
                      return (
                        <React.Fragment key={idx}>
                          <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px 4px', fontWeight: 500 }}>
                              {periodLabel}
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>
                                Đã chốt: {new Date(item.created_at).toLocaleString('vi-VN')}
                              </div>
                            </td>
                            <td style={{ padding: '8px 4px', color: 'var(--success)' }}>+{fmt(item.total_income)}</td>
                            <td style={{ padding: '8px 4px', color: 'var(--danger)' }}>-{fmt(item.total_expense + (item.fixed_costs || 0))}</td>
                            <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: item.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {item.net_profit >= 0 ? '+' : ''}{fmt(item.net_profit)}
                            </td>
                            <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                              <button onClick={() => setExpandedSettlementId(isExpanded ? null : item.id)} className="btn btn-glass" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                                {isExpanded ? 'Đóng' : 'Xem'}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <td colSpan={5} style={{ padding: '0 4px 1rem 4px' }}>
                                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '4px', padding: '12px', border: '1px solid var(--glass-border)' }}>
                                  
                                  <h4 style={{ color: 'var(--success)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Thu nhập (+ {fmt(item.total_income)})</h4>
                                  <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {incomes.length > 0 ? incomes.map(t => (
                                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{new Date(t.transaction_date).toLocaleDateString('vi-VN')} - {getCategoryName(t.category, true)} {t.note ? `(${t.note})` : ''}</span>
                                        <span style={{ color: 'var(--success)' }}>+{fmt(t.amount)}</span>
                                      </div>
                                    )) : <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Không có)</span>}
                                  </div>

                                  <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Chi phí vận hành (- {fmt(item.total_expense)})</h4>
                                  <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {expenses.length > 0 ? expenses.map(t => (
                                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{new Date(t.transaction_date).toLocaleDateString('vi-VN')} - {getCategoryName(t.category, false)} {t.note ? `(${t.note})` : ''}</span>
                                        <span style={{ color: 'var(--danger)' }}>-{fmt(t.amount)}</span>
                                      </div>
                                    )) : <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Không có)</span>}
                                  </div>
                                  
                                  {funds.length > 0 && (
                                    <>
                                      <h4 style={{ color: 'var(--warning)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Đã chi từ Quỹ</h4>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem' }}>
                                        {funds.map(t => (
                                          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>{new Date(t.transaction_date).toLocaleDateString('vi-VN')} - {getCategoryName(t.category, false)} {t.note ? `(${t.note})` : ''}</span>
                                            <span style={{ color: 'var(--warning)' }}>-{fmt(t.amount)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}

                                  <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                    <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Phân bổ lợi nhuận</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Tiền lãi chia Góc Đầu Tư:</span>
                                        <strong style={{ color: 'var(--success)' }}>{fmt(item.owner_amount || 0)}</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Tiền lãi chia Góc Vận Hành:</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>{fmt(item.driver_amount || 0)}</strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>Chưa có kỳ nào được chốt sổ.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
