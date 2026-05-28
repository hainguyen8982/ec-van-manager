'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendTelegramNotification } from '@/app/actions';

interface WeekStats {
  totalIncome: number;
  totalExpense: number;
  fixedCosts: number;
  carryForward: number;
  netProfit: number;
  driverAmount: number;
  ownerAmount: number;
  driverRatio: number;
  weekNumber?: number;
  weekYear?: number;
  bankLoanWeekly: number;
  parkingWeekly: number;
  reserveWeekly: number;
  fundDeduction?: number;
  fundDeductionNote?: string;
  reserveSpent?: number;
  reserveBalance?: number;
  startDate: string;
  endDate: string;
  daysCount: number;
  transactions: any[];
  revenueSources: any[];
  expenseCategories: any[];
}

export default function OperationsSettlementPage() {
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [customDeduction, setCustomDeduction] = useState<number>(0);
  const [deductionNote, setDeductionNote] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const supabase = createClient();

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  const loadStats = useCallback(async () => {
    const now = new Date();

    // 1. Get the last confirmed settlement to determine start date
    const prevRes = await supabase.from('weekly_settlements').select('*').eq('is_confirmed', true).order('created_at', { ascending: false }).limit(1);
    const lastSettlement = prevRes.data?.[0];
    
    // Determine start date
    let startDateObj = new Date(now.getFullYear(), now.getMonth(), 1); // fallback to start of month
    if (lastSettlement) {
      startDateObj = lastSettlement.end_date ? new Date(lastSettlement.end_date) : new Date(lastSettlement.created_at);
    }
    
    const endDateObj = now;
    
    // Calculate exact days for proportional fixed costs
    const startDay = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
    const endDay = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate());
    let days = Math.max(0, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)));

    const [txRes, settingsRes] = await Promise.all([
      supabase.from('transactions').select('*').is('settlement_id', null).lte('transaction_date', endDateObj.toISOString()).order('transaction_date', { ascending: true }),
      supabase.from('settings').select('*').single(),
    ]);

    const transactions = txRes.data || [];
    const settings = settingsRes.data;

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const bankLoanWeekly = settings && settings.is_bank_loan_active !== false ? Math.round((settings.bank_loan_monthly / 30) * days) : 0;
    const parkingWeekly = settings && settings.is_parking_active !== false ? Math.round((settings.parking_monthly / 30) * days) : 0;
    const reserveWeekly = settings && settings.is_reserve_active !== false ? Math.round((settings.reserve_monthly / 30) * days) : 0;
    const weeklyFixed = bankLoanWeekly + parkingWeekly + reserveWeekly;
const reserveSpent = transactions.filter(t => (t as any).is_fund_spent).reduce((s, t) => s + t.amount, 0);
const reserveBalance = reserveWeekly - reserveSpent;

    const carryForward = lastSettlement && lastSettlement.net_profit < 0 ? Math.abs(lastSettlement.net_profit) : 0;
    const netProfit = totalIncome - totalExpense - weeklyFixed - carryForward;
    const driverRatio = settings?.driver_ratio ?? 50;
    const driverAmount = netProfit > 0 ? Math.round(netProfit * driverRatio / 100) : 0;
    const ownerAmount = netProfit > 0 ? netProfit - driverAmount : 0;

    // No custom fund deduction by default in new workflow, legacy field
    const fundDeduction = settings?.default_fund_deduction ?? 0;

    setStats({
      totalIncome,
      totalExpense,
      fixedCosts: weeklyFixed,
      carryForward,
      netProfit,
      driverAmount,
      ownerAmount,
      driverRatio,
      bankLoanWeekly,
      parkingWeekly,
      reserveWeekly,
      reserveSpent,
      reserveBalance,
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
      daysCount: days,
      transactions,
      revenueSources: settings?.revenue_sources || [],
      expenseCategories: settings?.expense_categories || [],
    });
    setConfirmed(false); // Unsettled status determined by having no settlement_id
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) return (
    <div className="page-transition" style={{ display: 'grid', gap: '1rem', padding: '1rem 0' }}>
      <div className="skeleton-box" style={{ height: '40px', width: '200px', marginBottom: '1rem' }}></div>
      <div className="skeleton-box" style={{ height: '120px' }}></div>
      <div className="skeleton-box" style={{ height: '120px' }}></div>
      <div className="skeleton-box" style={{ height: '120px' }}></div>
    </div>
  );
  if (!stats) return null;

  const now = new Date();

  const getCategoryName = (id: string, isIncome: boolean) => {
    if (isIncome) {
      const src = stats.revenueSources.find((s: any) => s.id === id);
      return src ? src.name : id;
    } else {
      const cat = stats.expenseCategories.find((c: any) => c.id === id);
      return cat ? `${cat.icon} ${cat.name}` : id;
    }
  };

  const generateReportText = () => {
    if (!stats) return '';
    let text = `BÁO CÁO CHỐT SỔ\n`;
    text += `Kỳ: ${new Date(stats.startDate).toLocaleDateString('vi-VN')} - ${new Date(stats.endDate).toLocaleDateString('vi-VN')} (${stats.daysCount} ngày)\n`;
    text += `--------------------------\n`;
    text += `1. TỔNG THU: +${fmt(stats.totalIncome)} đ\n`;
    text += `2. TỔNG CHI: -${fmt(stats.totalExpense)} đ\n`;
    text += `3. TRÍCH QUỸ CỐ ĐỊNH:\n`;
    text += `   - Ngân hàng: -${fmt(stats.bankLoanWeekly)} đ\n`;
    text += `   - Bãi xe: -${fmt(stats.parkingWeekly)} đ\n`;
    text += `   - Dự phòng: -${fmt(stats.reserveWeekly)} đ\n`;
    if (stats.carryForward > 0) text += `4. NỢ KỲ TRƯỚC: -${fmt(stats.carryForward)} đ\n`;
    text += `--------------------------\n`;
    text += `👉 LỢI NHUẬN RÒNG: ${stats.netProfit >= 0 ? '+' : ''}${fmt(stats.netProfit)} đ\n`;
    
    if (stats.netProfit > 0) {
      text += `\nPHÂN BỔ LỢI NHUẬN:\n`;
      text += `- Lãi chia Góc Đầu Tư: ${fmt(stats.ownerAmount)} đ\n`;
      text += `- Lãi chia Góc Vận Hành: ${fmt(stats.driverAmount)} đ\n`;
      text += `\n💰 TỔNG TIỀN CHUYỂN GÓC ĐẦU TƯ:\n`;
      text += `(Tiền Lãi + Tiền Dự phòng)\n`;
      text += `=> ${fmt(stats.ownerAmount + stats.reserveWeekly)} đ\n`;
    } else {
      text += `\n⚠️ Lợi nhuận âm, khoản thiếu sẽ chuyển sang nợ kỳ sau.\n`;
    }
    
    text += `\n--- BẢNG KÊ CHI PHÍ ---\n`;
    const expenses = stats.transactions.filter((t: any) => t.type === 'expense' && !t.is_fund_spent);
    if (expenses.length === 0) {
      text += `(Không có phát sinh chi phí)\n`;
    } else {
      expenses.forEach((t: any) => {
        const dateStr = new Date(t.transaction_date).toLocaleDateString('vi-VN');
        text += `- ${dateStr}: ${fmt(t.amount)} đ (${getCategoryName(t.category, false)})`;
        if (t.note) text += ` - ${t.note}`;
        text += `\n`;
      });
    }

    const fundExpenses = stats.transactions.filter((t: any) => t.type === 'expense' && t.is_fund_spent);
    if (fundExpenses.length > 0) {
      text += `\n--- CHI TIÊU TỪ QUỸ ---\n`;
      fundExpenses.forEach((t: any) => {
        const dateStr = new Date(t.transaction_date).toLocaleDateString('vi-VN');
        text += `- ${dateStr}: ${fmt(t.amount)} đ (${getCategoryName(t.category, false)})`;
        if (t.note) text += ` - ${t.note}`;
        text += `\n`;
      });
    }

    return text;
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateReportText());
    alert('✅ Đã copy Báo cáo vào khay nhớ tạm! Hãy mở Zalo và dán (Paste) để gửi.');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Chi tiết Chốt sổ</h2>
        <button 
          onClick={handleCopyReport}
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <span>📋</span> Copy gửi Zalo
        </button>
      </div>

      <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', fontSize: '1rem' }}>
          Kỳ chốt sổ: {new Date(stats.startDate).toLocaleDateString('vi-VN')} - {new Date(stats.endDate).toLocaleDateString('vi-VN')} <span style={{ color: 'var(--text-secondary)' }}>({stats.daysCount} ngày)</span>
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
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>↳ Quỹ ngân hàng:</span>
            <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>- {fmt(stats.bankLoanWeekly)} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>↳ Quỹ bãi xe:</span>
            <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>- {fmt(stats.parkingWeekly)} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>↳ Quỹ dự phòng:</span>
            <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>- {fmt(stats.reserveWeekly)} đ</span>
          </div>
          {(stats.reserveSpent ?? 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', borderTop: '1px dotted var(--glass-border)', paddingTop: '0.3rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>↳ Đã chi từ các Quỹ (trong kỳ):</span>
              <span style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>- {fmt(stats.reserveSpent ?? 0)} đ</span>
            </div>
          )}
          </div>
        {stats.carryForward > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Nợ kỳ trước chuyển sang:</span>
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
            <span style={{ color: 'var(--text-secondary)' }}>Tiền lãi chia cho Góc Đầu Tư:</span>
            <strong style={{ color: 'var(--success)' }}>{fmt(stats.ownerAmount)} đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tiền lãi chia cho Góc Vận Hành (Bạn):</span>
            <strong>{fmt(stats.driverAmount)} đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--glass-border)', paddingTop: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Các khoản Quỹ bạn giữ để đóng (Ngân hàng, Bãi xe):</span>
            <strong style={{ color: 'var(--warning)' }}>{fmt(stats.bankLoanWeekly + stats.parkingWeekly)} đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Quỹ dự phòng (Chuyển Góc Đầu Tư giữ):</span>
            <strong style={{ color: 'var(--warning)' }}>{fmt(stats.reserveWeekly)} đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '2px solid var(--primary)', paddingTop: '1rem' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>👉 SỐ TIỀN BẠN CẦN CHUYỂN CHO GÓC ĐẦU TƯ:</span>
            <div style={{ textAlign: 'right' }}>
              <strong style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>{fmt(stats.ownerAmount + stats.reserveWeekly)} đ</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                (Lãi: {fmt(stats.ownerAmount)} đ + Dự phòng: {fmt(stats.reserveWeekly)} đ)
              </div>
            </div>
          </div>
        </div>
      )}

      {stats.netProfit < 0 && (
        <div className="glass-panel" style={{ marginBottom: '1.5rem', border: '1px solid var(--danger)' }}>
          <p style={{ color: 'var(--warning)' }}>⚠️ Kỳ này lợi nhuận âm. Khoản thiếu <strong>{fmt(Math.abs(stats.netProfit))} đ</strong> sẽ được cộng vào kỳ sau.</p>
        </div>
      )}

      {/* BẢNG KÊ CHI TIẾT */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Bảng kê giao dịch chi tiết</h3>
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="btn btn-glass"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            {showDetails ? 'Ẩn bảng kê' : 'Xem chi tiết'}
          </button>
        </div>

        {showDetails && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <h4 style={{ color: 'var(--success)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Doanh thu (+ {fmt(stats.totalIncome)} đ)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
              {stats.transactions.filter(t => t.type === 'income').map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {new Date(t.transaction_date).toLocaleDateString('vi-VN')} - {getCategoryName(t.category, true)} {t.note ? `(${t.note})` : ''}
                    {t.receipt_url && <a href={t.receipt_url} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)' }}>📷</a>}
                  </span>
                  <span style={{ color: 'var(--success)' }}>+{fmt(t.amount)}</span>
                </div>
              ))}
              {stats.transactions.filter(t => t.type === 'income').length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '4px 8px' }}>(Không có dữ liệu)</p>
              )}
            </div>

            <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Chi phí vận hành (- {fmt(stats.totalExpense)} đ)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
              {stats.transactions.filter(t => t.type === 'expense' && !t.is_fund_spent).map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {new Date(t.transaction_date).toLocaleDateString('vi-VN')} - {getCategoryName(t.category, false)} {t.note ? `(${t.note})` : ''}
                    {t.receipt_url && <a href={t.receipt_url} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)' }}>📷</a>}
                  </span>
                  <span style={{ color: 'var(--danger)' }}>-{fmt(t.amount)}</span>
                </div>
              ))}
              {stats.transactions.filter(t => t.type === 'expense' && !t.is_fund_spent).length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '4px 8px' }}>(Không có dữ liệu)</p>
              )}
            </div>

            {stats.transactions.some(t => t.type === 'expense' && t.is_fund_spent) && (
              <>
                <h4 style={{ color: 'var(--warning)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Đã chi từ Quỹ</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {stats.transactions.filter(t => t.type === 'expense' && t.is_fund_spent).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {new Date(t.transaction_date).toLocaleDateString('vi-VN')} - {getCategoryName(t.category, false)} {t.note ? `(${t.note})` : ''}
                        {t.receipt_url && <a href={t.receipt_url} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)' }}>📷</a>}
                      </span>
                      <span style={{ color: 'var(--warning)' }}>-{fmt(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

    {/* UI for custom fund deduction when not confirmed */}
    {!confirmed && (
      <div style={{ marginTop: '1rem', padding: '1rem', borderTop: '1px solid var(--glass-border)' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Xác nhận Chốt sổ</h3>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Lưu ý: Các Quỹ cố định đã được hệ thống tự động tính theo số ngày thực tế ({stats.daysCount} ngày).
          </label>
        </div>
        <button
          className="btn btn-success"
          onClick={async () => {
            const { data: newSettlement, error } = await supabase.from('weekly_settlements').insert({
              start_date: stats.startDate,
              end_date: stats.endDate,
              is_confirmed: true,
              net_profit: stats.netProfit,
              total_income: stats.totalIncome,
              total_expense: stats.totalExpense,
              fixed_costs: stats.fixedCosts,
              bank_loan_weekly: stats.bankLoanWeekly,
              parking_weekly: stats.parkingWeekly,
              reserve_weekly: stats.reserveWeekly,
              driver_amount: stats.driverAmount,
              owner_amount: stats.ownerAmount,
            }).select().single();

            if (error) {
              alert('Lưu thất bại: ' + error.message);
              return;
            }

              if (newSettlement) {
                // Update all unsettled transactions to link to this settlement
                const txIds = stats.transactions.map(t => t.id);
                if (txIds.length > 0) {
                  const { error: txError } = await supabase.from('transactions').update({ settlement_id: newSettlement.id }).in('id', txIds);
                  if (txError) {
                    alert('Cảnh báo: Đã tạo bảng chốt sổ nhưng lỗi khi cập nhật giao dịch.');
                  }
                }
                setConfirmed(true);
                
                // Send Telegram Notification
                const msg = `🧾 <b>[CHỐT SỔ THÀNH CÔNG]</b>\nKỳ: ${new Date(stats.startDate).toLocaleDateString('vi-VN')} - ${new Date(stats.endDate).toLocaleDateString('vi-VN')} (${stats.daysCount} ngày)\n\nLợi nhuận ròng: <b>${stats.netProfit >= 0 ? '+' : ''}${fmt(stats.netProfit)} đ</b>\n💰 <b>TỔNG CHUYỂN GÓC ĐẦU TƯ: ${fmt(stats.ownerAmount + stats.reserveWeekly)} đ</b>\n<i>(Bao gồm Lãi ${fmt(stats.ownerAmount)} đ + Quỹ dự phòng ${fmt(stats.reserveWeekly)} đ)</i>\n\nHãy vào phần Quản lý để xem Báo cáo chi tiết.`;
                sendTelegramNotification(msg);
              }
            }}
          >
          Xác nhận Chốt sổ
        </button>
      </div>
    )}
    </div>
  );
}
