'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendTelegramNotification } from '@/app/actions';

export default function ExpensePage() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('charge');
  const [note, setNote] = useState('');
  const [isFundSpent, setIsFundSpent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [categories, setCategories] = useState<{ id: string; name: string; icon: string; isFundEligible: boolean }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('settings').select('expense_categories').single();
      const loadedCategories = data?.expense_categories || [];
      if (loadedCategories.length === 0) {
        setCategories([
          { id: 'charge', name: 'Sạc pin', icon: '⚡', isFundEligible: false },
          { id: 'toll', name: 'Cầu đường', icon: '🛣️', isFundEligible: false },
          { id: 'parking', name: 'Gửi xe', icon: '🅿️', isFundEligible: false },
          { id: 'repair', name: 'Sửa chữa', icon: '🔧', isFundEligible: true },
          { id: 'bank', name: 'Ngân hàng', icon: '🏦', isFundEligible: true }
        ]);
        setCategory('charge');
      } else {
        setCategories(loadedCategories);
        if (loadedCategories.length > 0) {
          const hasDefault = loadedCategories.some((c: { id: string }) => c.id === 'charge');
          if (!hasDefault) {
            setCategory(loadedCategories[0].id);
          }
        }
      }
      setLoadingCategories(false);
    };
    fetchCategories();
  }, []);

  const formatCurrency = (val: string) => {
    const rawValue = val.replace(/\D/g, '');
    if (!rawValue) return '';
    return parseInt(rawValue, 10).toLocaleString('vi-VN');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatCurrency(e.target.value));
  };

  const getWeekInfo = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return { week_number: weekNumber, week_year: now.getFullYear() };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = parseInt(amount.replace(/\D/g, ''), 10);
    if (!rawAmount || rawAmount <= 0) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const supabase = createClient();
    const { week_number, week_year } = getWeekInfo();

    let receipt_url = null;
    if (file) {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file);
      
      if (uploadError) {
        setError('Lỗi tải ảnh lên: ' + uploadError.message);
        setLoading(false);
        setUploading(false);
        return;
      }
      
      const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
      receipt_url = publicUrlData.publicUrl;
      setUploading(false);
    }

    const { error: insertError } = await supabase.from('transactions').insert({
      type: 'expense',
      amount: rawAmount,
      category,
      note: note || null,
      transaction_date: new Date().toISOString().split('T')[0],
      week_number,
      week_year,
      is_fund_spent: isFundSpent,
      receipt_url,
    });

    if (insertError) {
      setError('Có lỗi xảy ra, vui lòng thử lại.');
    } else {
      const selectedCat = categories.find(c => c.id === category);
      setSuccess(`✅ Đã lưu chi phí ${amount} đ — ${selectedCat?.icon} ${selectedCat?.name || category}`);
      
      // Send Telegram notification
      const msg = `💸 <b>[CHI PHÍ MỚI]</b>\nLoại chi phí: <b>${selectedCat?.icon || ''} ${selectedCat?.name || category}</b>\nSố tiền: <b>${amount} đ</b>\n${isFundSpent ? '⚠️ <i>Lấy từ Quỹ dùng chung</i>\n' : ''}${note ? `Ghi chú: <i>${note}</i>\n` : ''}${receipt_url ? `<a href="${receipt_url}">[Xem ảnh chứng từ]</a>\n` : ''}Thời gian: ${new Date().toLocaleString('vi-VN')}`;
      await sendTelegramNotification(msg);

      setAmount('');
      setNote('');
      setIsFundSpent(false);
      setFile(null);
      setPreviewUrl(null);
    }
    setLoading(false);
  };

  const selectedCategoryData = categories.find(c => c.id === category);

  return (
    <div className="page-transition">
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Ghi nhận Chi phí</h2>

      <div className="glass-panel">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Loại chi phí</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {loadingCategories ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '0.5rem' }}>Đang tải...</div>
              ) : (
                categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`btn ${category === cat.id ? 'btn-primary' : 'btn-glass'}`}
                    onClick={() => {
                      setCategory(cat.id);
                      if (!cat.isFundEligible) setIsFundSpent(false);
                    }}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '1.5rem' }}>
            <label className="input-label">Số tiền (VNĐ)</label>
            <input
              type="tel"
              className="input-field"
              placeholder="VD: 50.000"
              value={amount}
              onChange={handleAmountChange}
              required
              style={{ fontSize: '1.25rem', padding: '16px' }}
            />
          </div>

          <div className="input-group" style={{ marginTop: '1.5rem' }}>
            <label className="input-label">Ghi chú (Không bắt buộc)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ghi chú chi tiết..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {selectedCategoryData?.isFundEligible && (
            <>
              <div className="input-group" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="isFundSpent"
                  checked={isFundSpent}
                  onChange={(e) => setIsFundSpent(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="isFundSpent" style={{ cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}>
                  Chi trả từ Quỹ dự phòng
                </label>
              </div>
              {isFundSpent && (
                <p style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                  ⚠️ Chi phí này sẽ được trừ trực tiếp từ số dư Quỹ dự phòng và KHÔNG tính vào chi phí vận hành kỳ này của tài xế.
                </p>
              )}
            </>
          )}

          <div className="input-group" style={{ marginTop: '1.5rem' }}>
            <label className="input-label">Ảnh hóa đơn (Tùy chọn)</label>
            <label style={{
              border: '1px dashed var(--glass-border-hover)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'block'
            }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const selectedFile = e.target.files[0];
                    setFile(selectedFile);
                    setPreviewUrl(URL.createObjectURL(selectedFile));
                  }
                }} 
                style={{ display: 'none' }} 
              />
              {previewUrl ? (
                <div style={{ position: 'relative', width: '100%', maxWidth: '200px', margin: '0 auto' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview" style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }} />
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--primary)' }}>Chạm để đổi ảnh khác</p>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: '2rem' }}>📷</span>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Chạm để chụp ảnh hoặc tải lên</p>
                </>
              )}
              {uploading && <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)' }}>Đang tải ảnh lên...</p>}
            </label>
          </div>

          {success && (
            <div style={{ marginTop: '1rem', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--success)', fontSize: '0.95rem' }}>
              {success}
            </div>
          )}
          {error && (
            <div style={{ marginTop: '1rem', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: '0.95rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '16px', marginTop: '1rem', fontSize: '1.1rem', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Đang lưu...' : 'Lưu Chi Phí'}
          </button>
        </form>
      </div>
    </div>
  );
}
