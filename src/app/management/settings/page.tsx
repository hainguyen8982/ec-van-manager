'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const EMOJI_LIBRARY = [
  {
    category: 'Phương tiện & Di chuyển',
    emojis: ['⚡', '🔋', '🔌', '🚐', '🚗', '🚙', '🚚', '🛵', '🚲', '🛣️', '🅿️', '🔧', '🛠️', '🧼', '🧽', '⛽', '🚨', '🎫', '🗺️', '📍']
  },
  {
    category: 'Tài chính & Hành chính',
    emojis: ['🏦', '💳', '💵', '💰', '💸', '📈', '📊', '📄', '📝', '📁', '💼', '⚙️', '⚖️', '🏢']
  },
  {
    category: 'Sinh hoạt & Khác',
    emojis: ['☕', '🍽️', '🥤', '🍕', '🏪', '🛒', '📦', '🏠', '📞', '💬', '👤', '👥', '🩹', '🩺', '📢', '🔒']
  }
];
import { createClient } from '@/lib/supabase/client';
import { cleanTestData } from '@/app/actions';

export default function SettingsPage() {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [bankLoan, setBankLoan] = useState('');
  const [isBankLoanActive, setIsBankLoanActive] = useState(true);
  const [parking, setParking] = useState('');
  const [isParkingActive, setIsParkingActive] = useState(true);
  const [reserve, setReserve] = useState('');
  const [isReserveActive, setIsReserveActive] = useState(true);
  const [driverRatio, setDriverRatio] = useState('50');
  const [maintenanceInterval, setMaintenanceInterval] = useState('12');
  const [maintenanceMinFund, setMaintenanceMinFund] = useState('2.000.000');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Nguồn doanh thu động
  const [revenueSources, setRevenueSources] = useState<{ id: string; name: string; color: string }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [sourceColor, setSourceColor] = useState('#00b14f');

  // Loại chi phí động
  const [expenseCategories, setExpenseCategories] = useState<{ id: string; name: string; icon: string; isFundEligible: boolean }[]>([]);
  const [expEditingIndex, setExpEditingIndex] = useState<number | null>(null);
  const [expName, setExpName] = useState('');
  const [expId, setExpId] = useState('');
  const [expIcon, setExpIcon] = useState('⚡');
  const [expFund, setExpFund] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const formatCurrency = (val: number | string) => {
    const raw = String(val).replace(/\D/g, '');
    if (!raw) return '';
    return parseInt(raw, 10).toLocaleString('vi-VN');
  };

  const parseAmount = (val: string) => parseInt(val.replace(/\D/g, ''), 10) || 0;

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) {
      setSettingsId(data.id);
      setBankLoan(formatCurrency(data.bank_loan_monthly));
      setIsBankLoanActive(data.is_bank_loan_active ?? true);
      setParking(formatCurrency(data.parking_monthly));
      setIsParkingActive(data.is_parking_active ?? true);
      setReserve(formatCurrency(data.reserve_monthly));
      setIsReserveActive(data.is_reserve_active ?? true);
      setDriverRatio(String(data.driver_ratio));
      setMaintenanceInterval(String(data.maintenance_interval_weeks ?? 12));
      setMaintenanceMinFund(formatCurrency(data.maintenance_min_fund ?? 2000000));

      const sources = data.revenue_sources || [];
      if (sources.length === 0) {
        setRevenueSources([
          { id: 'grab', name: 'Grab', color: '#00b14f' },
          { id: 'ahamove', name: 'Ahamove', color: '#ff6b00' },
          { id: 'lalamove', name: 'Lalamove', color: '#ff8b00' }
        ]);
      } else {
        setRevenueSources(sources);
      }

      const expenses = data.expense_categories || [];
      if (expenses.length === 0) {
        setExpenseCategories([
          { id: 'charge', name: 'Sạc pin', icon: '⚡', isFundEligible: false },
          { id: 'toll', name: 'Cầu đường', icon: '🛣️', isFundEligible: false },
          { id: 'parking', name: 'Gửi xe', icon: '🅿️', isFundEligible: false },
          { id: 'repair', name: 'Sửa chữa', icon: '🔧', isFundEligible: true },
          { id: 'bank', name: 'Ngân hàng', icon: '🏦', isFundEligible: true }
        ]);
      } else {
        setExpenseCategories(expenses);
      }
    } else {
      setRevenueSources([
        { id: 'grab', name: 'Grab', color: '#00b14f' },
        { id: 'ahamove', name: 'Ahamove', color: '#ff6b00' },
        { id: 'lalamove', name: 'Lalamove', color: '#ff8b00' }
      ]);
      setExpenseCategories([
          { id: 'charge', name: 'Sạc pin', icon: '⚡', isFundEligible: false },
          { id: 'toll', name: 'Cầu đường', icon: '🛣️', isFundEligible: false },
          { id: 'parking', name: 'Gửi xe', icon: '🅿️', isFundEligible: false },
          { id: 'repair', name: 'Sửa chữa', icon: '🔧', isFundEligible: true },
          { id: 'bank', name: 'Ngân hàng', icon: '🏦', isFundEligible: true }
      ]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowIconPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    const payload: any = {
      bank_loan_monthly: parseAmount(bankLoan),
      is_bank_loan_active: isBankLoanActive,
      parking_monthly: parseAmount(parking),
      is_parking_active: isParkingActive,
      reserve_monthly: parseAmount(reserve),
      is_reserve_active: isReserveActive,
      driver_ratio: parseInt(driverRatio, 10),
      maintenance_interval_weeks: parseInt(maintenanceInterval, 10),
      maintenance_min_fund: parseAmount(maintenanceMinFund),
      revenue_sources: revenueSources,
      expense_categories: expenseCategories,
      updated_at: new Date().toISOString(),
    };

    let saveError;
    
    if (settingsId) {
      const { error } = await supabase
        .from('settings')
        .update(payload)
        .eq('id', settingsId);
      saveError = error;
    } else {
      const { data, error } = await supabase
        .from('settings')
        .insert(payload)
        .select();
      saveError = error;
      if (data && data[0]) {
        setSettingsId(data[0].id);
      }
    }

    if (saveError) {
      setError(`❌ Lỗi khi lưu cấu hình: ${saveError.message}`);
    } else {
      setSuccess('✅ Đã lưu cấu hình thành công!');
    }
    setSaving(false);
  };

  const ownerRatio = 100 - parseInt(driverRatio || '50', 10);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Đang tải cấu hình...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Cấu hình Hệ thống</h2>

      <div className="glass-panel">
        <form onSubmit={handleSave}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Chi phí Cố định (Tháng)</h3>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Tiền góp ngân hàng (Tháng này)</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={isBankLoanActive} onChange={(e) => setIsBankLoanActive(e.target.checked)} />
                <span style={{ color: isBankLoanActive ? 'var(--success)' : 'var(--text-secondary)' }}>Kích hoạt trích quỹ</span>
              </label>
            </div>
            <input type="tel" className="input-field"
              value={bankLoan}
              onChange={(e) => setBankLoan(formatCurrency(e.target.value))}
              disabled={!isBankLoanActive}
              required={isBankLoanActive} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.4 }}>
              * Mở App ngân hàng xem tháng này đóng bao nhiêu rồi điền vào. Hệ thống tự chia 4 tuần.
            </p>
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Tiền bãi đỗ xe / tháng</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={isParkingActive} onChange={(e) => setIsParkingActive(e.target.checked)} />
                <span style={{ color: isParkingActive ? 'var(--success)' : 'var(--text-secondary)' }}>Kích hoạt trích quỹ</span>
              </label>
            </div>
            <input type="tel" className="input-field"
              value={parking}
              onChange={(e) => setParking(formatCurrency(e.target.value))}
              disabled={!isParkingActive}
              required={isParkingActive} />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Trích lập Dự phòng / tháng</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={isReserveActive} onChange={(e) => setIsReserveActive(e.target.checked)} />
                <span style={{ color: isReserveActive ? 'var(--success)' : 'var(--text-secondary)' }}>Kích hoạt trích quỹ</span>
              </label>
            </div>
            <input type="tel" className="input-field"
              value={reserve}
              onChange={(e) => setReserve(formatCurrency(e.target.value))}
              disabled={!isReserveActive}
              required={isReserveActive} />
          </div>

          <div style={{ marginTop: '1rem', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,210,255,0.05)', border: '1px solid var(--glass-border)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              📊 Tổng quỹ cố định/tháng thực thu:{' '}
              <strong style={{ color: 'var(--warning)' }}>
                {formatCurrency(
                  (isBankLoanActive ? parseAmount(bankLoan) : 0) + 
                  (isParkingActive ? parseAmount(parking) : 0) + 
                  (isReserveActive ? parseAmount(reserve) : 0)
                )} đ
              </strong>
            </p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />

          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--success)' }}>Tỷ lệ Chia Lợi nhuận ròng</h3>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Góc Vận Hành</p>
                <p style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)' }}>{driverRatio}%</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Góc Đầu Tư</p>
                <p style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)' }}>{ownerRatio}%</p>
              </div>
            </div>
            <input
              type="range" min="0" max="100" step="5"
              value={driverRatio}
              onChange={(e) => setDriverRatio(e.target.value)}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />

          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--warning)' }}>Cảnh báo Bảo dưỡng & Ngưỡng Quỹ</h3>

          <div className="input-group">
            <label className="input-label">Chu kỳ bảo dưỡng định kỳ (Tuần)</label>
            <input type="number" className="input-field"
              value={maintenanceInterval}
              onChange={(e) => setMaintenanceInterval(e.target.value)}
              min="1"
              required />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.4 }}>
              * Hệ thống sẽ cảnh báo nếu xe chưa được bảo dưỡng/sửa chữa sau số tuần này.
            </p>
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="input-label">Ngưỡng an toàn Quỹ dự phòng (VNĐ)</label>
            <input type="tel" className="input-field"
              value={maintenanceMinFund}
              onChange={(e) => setMaintenanceMinFund(formatCurrency(e.target.value))}
              required />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.4 }}>
              * Hệ thống cảnh báo khi số dư Quỹ dự phòng thấp hơn số tiền này.
            </p>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />

          {/* QUẢN LÝ NGUỒN DOANH THU (APP LIÊN KẾT) */}
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--success)' }}>Nguồn Doanh thu (App liên kết)</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
            Các ứng dụng được cấu hình ở đây sẽ hiển thị khi tài xế ghi nhận doanh thu và trong các báo cáo thống kê.
          </p>

          {/* Danh sách các app hiện có */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {revenueSources.map((src, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: src.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{src.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({src.id})</span>
                </div>
                <button
                  type="button"
                  className="btn btn-glass"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  onClick={() => {
                    setEditingIndex(idx);
                    setSourceName(src.name);
                    setSourceId(src.id);
                    setSourceColor(src.color);
                  }}
                >✏️ Sửa</button>
                <button
                  type="button"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  onClick={() => setRevenueSources(revenueSources.filter((_, i) => i !== idx))}
                >🗑️ Xóa</button>
              </div>
            ))}
          </div>

          {/* Form thêm / sửa app */}
          <div style={{ padding: '12px', background: 'rgba(0,210,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--primary)' }}>
              {editingIndex !== null ? `✏️ Sửa: ${revenueSources[editingIndex]?.name}` : '➕ Thêm App mới'}
            </p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tên hiển thị</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                    placeholder="VD: Grab"
                    value={sourceName}
                    onChange={e => setSourceName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>ID danh mục (không dấu, không khoảng cách)</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                    placeholder="VD: grab"
                    value={sourceId}
                    onChange={e => setSourceId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    disabled={editingIndex !== null}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Màu sắc</label>
                  <input
                    type="color"
                    value={sourceColor}
                    onChange={e => setSourceColor(e.target.value)}
                    style={{ width: '48px', height: '36px', padding: '2px', border: '1px solid var(--glass-border)', borderRadius: '4px', background: 'transparent', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    onClick={() => {
                      if (!sourceName.trim() || !sourceId.trim()) return;
                      const newSource = { id: sourceId.trim(), name: sourceName.trim(), color: sourceColor };
                      if (editingIndex !== null) {
                        const updated = [...revenueSources];
                        updated[editingIndex] = { ...newSource, id: revenueSources[editingIndex].id };
                        setRevenueSources(updated);
                        setEditingIndex(null);
                      } else {
                        if (revenueSources.some(s => s.id === newSource.id)) {
                          alert('ID này đã tồn tại, vui lòng chọn ID khác.');
                          return;
                        }
                        setRevenueSources([...revenueSources, newSource]);
                      }
                      setSourceName('');
                      setSourceId('');
                      setSourceColor('#00b14f');
                    }}
                  >
                    {editingIndex !== null ? 'Cập nhật' : 'Thêm App'}
                  </button>
                  {editingIndex !== null && (
                    <button
                      type="button"
                      className="btn btn-glass"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      onClick={() => {
                        setEditingIndex(null);
                        setSourceName('');
                        setSourceId('');
                        setSourceColor('#00b14f');
                      }}
                    >Hủy</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />

          {/* QUẢN LÝ LOẠI CHI PHÍ */}
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--danger)' }}>Loại Chi phí (Vận hành)</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
            Quản lý các danh mục chi phí (sạc pin, gửi xe...). Nhấp "Sửa" hoặc thêm mới ở bên dưới.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {expenseCategories.map((cat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '1.25rem', flexShrink: 0, width: '24px', textAlign: 'center' }}>{cat.icon}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cat.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({cat.id}) {cat.isFundEligible && '• Quỹ DP'}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-glass"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  onClick={() => {
                    setExpEditingIndex(idx);
                    setExpName(cat.name);
                    setExpId(cat.id);
                    setExpIcon(cat.icon);
                    setExpFund(cat.isFundEligible);
                    setShowIconPicker(false);
                  }}
                >✏️ Sửa</button>
                <button
                  type="button"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  onClick={() => {
                    if (cat.id === 'charge') {
                      alert('Không thể xóa danh mục "charge" (Sạc pin) vì liên quan đến thống kê hệ thống!');
                      return;
                    }
                    setExpenseCategories(expenseCategories.filter((_, i) => i !== idx));
                  }}
                >🗑️ Xóa</button>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px', background: 'rgba(239,68,68,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--danger)' }}>
              {expEditingIndex !== null ? `✏️ Sửa: ${expenseCategories[expEditingIndex]?.name}` : '➕ Thêm Danh mục mới'}
            </p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '0.5rem', position: 'relative' }}>
                <div ref={pickerRef} style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Icon</label>
                  <button
                    type="button"
                    className="input-field"
                    style={{ fontSize: '1.25rem', padding: '0', height: '42px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    title="Chọn icon từ thư viện"
                  >
                    {expIcon}
                  </button>
                  {showIconPicker && (
                    <div style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      zIndex: 10,
                      width: '280px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid var(--glass-border-hover)',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'var(--glass-shadow)',
                      padding: '12px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>Thư viện Icon</span>
                        <button
                          type="button"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}
                          onClick={() => setShowIconPicker(false)}
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {EMOJI_LIBRARY.map((group, gIdx) => (
                          <div key={gIdx}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {group.category}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                              {group.emojis.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  style={{
                                    fontSize: '1.2rem',
                                    padding: '4px',
                                    background: expIcon === emoji ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                                    border: expIcon === emoji ? '1px solid var(--primary)' : '1px solid transparent',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  onClick={() => {
                                    setExpIcon(emoji);
                                    setShowIconPicker(false);
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = expIcon === emoji ? 'rgba(0, 210, 255, 0.2)' : 'transparent';
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '8px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Hoặc nhập emoji khác:</label>
                        <input
                          type="text"
                          className="input-field"
                          style={{ fontSize: '0.9rem', padding: '4px 8px', height: '30px', textAlign: 'center' }}
                          value={expIcon}
                          maxLength={2}
                          onChange={(e) => setExpIcon(e.target.value)}
                          placeholder="Nhập..."
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tên hiển thị</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                    placeholder="VD: Rửa xe"
                    value={expName}
                    onChange={e => setExpName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>ID danh mục</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                    placeholder="VD: wash"
                    value={expId}
                    onChange={e => setExpId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    disabled={expEditingIndex !== null}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="expFund"
                  checked={expFund}
                  onChange={e => setExpFund(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="expFund" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Cho phép chi từ Quỹ dự phòng</label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={() => {
                    if (!expName.trim() || !expId.trim() || !expIcon.trim()) return;
                    const newCat = { id: expId.trim(), name: expName.trim(), icon: expIcon.trim(), isFundEligible: expFund };
                    if (expEditingIndex !== null) {
                      const updated = [...expenseCategories];
                      updated[expEditingIndex] = { ...newCat, id: expenseCategories[expEditingIndex].id };
                      setExpenseCategories(updated);
                      setExpEditingIndex(null);
                    } else {
                      if (expenseCategories.some(c => c.id === newCat.id)) {
                        alert('ID này đã tồn tại, vui lòng chọn ID khác.');
                        return;
                      }
                      setExpenseCategories([...expenseCategories, newCat]);
                    }
                    setExpName('');
                    setExpId('');
                    setExpIcon('⚡');
                    setExpFund(false);
                    setShowIconPicker(false);
                  }}
                >
                  {expEditingIndex !== null ? 'Cập nhật' : 'Thêm Danh mục'}
                </button>
                {expEditingIndex !== null && (
                  <button
                    type="button"
                    className="btn btn-glass"
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    onClick={() => {
                      setExpEditingIndex(null);
                      setExpName('');
                      setExpId('');
                      setExpIcon('⚡');
                      setExpFund(false);
                      setShowIconPicker(false);
                    }}
                  >Hủy</button>
                )}
              </div>
            </div>
          </div>

          {success && (
            <div style={{ marginTop: '1rem', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--success)' }}>
              {success}
            </div>
          )}

          {error && (
            <div style={{ marginTop: '1rem', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary"
            disabled={saving}
            style={{ width: '100%', padding: '16px', marginTop: '2rem', fontSize: '1.1rem', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
          </button>
        </form>
      </div>
      
      {/* KHU VỰC DỌN DẸP DỮ LIỆU TEST */}
      <div className="glass-panel" style={{ marginTop: '2rem', border: '1px solid var(--danger)' }}>
        <h3 style={{ color: 'var(--danger)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Dọn dẹp Dữ liệu Test</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
          Công cụ này sẽ xóa sạch các khoản Thu, Chi, Quỹ có chứa chữ <strong>[TEST]</strong> trong Ghi chú. 
          Giúp bạn thoải mái nhập số liệu chạy thử mà không sợ làm bẩn hệ thống.
        </p>
        <button 
          type="button" 
          className="btn btn-danger"
          style={{ width: '100%', padding: '12px' }}
          onClick={async () => {
            if (confirm('Bạn có chắc chắn muốn xóa toàn bộ các dữ liệu có gắn thẻ [TEST] không? Hành động này không thể hoàn tác!')) {
              const res = await cleanTestData();
              if (res.success) {
                alert('✅ Đã dọn dẹp sạch sẽ toàn bộ dữ liệu Test!');
                window.location.reload();
              } else {
                alert('❌ Lỗi: ' + res.error);
              }
            }
          }}
        >
          🗑️ Dọn dẹp ngay
        </button>
      </div>
    </div>
  );
}
