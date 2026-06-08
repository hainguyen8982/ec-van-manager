'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendTelegramNotification } from '@/app/actions';

export default function IncomePage() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('grab');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [sources, setSources] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('settings').select('revenue_sources').single();
      const loadedSources = data?.revenue_sources || [];
      if (loadedSources.length === 0) {
        setSources([
          { id: 'grab', name: 'Grab', color: '#00b14f' },
          { id: 'ahamove', name: 'Ahamove', color: '#ff6b00' },
          { id: 'lalamove', name: 'Lalamove', color: '#ff8b00' }
        ]);
        setSource('grab');
      } else {
        setSources(loadedSources);
        if (loadedSources.length > 0) {
          const hasDefault = loadedSources.some((s: { id: string }) => s.id === 'grab');
          if (!hasDefault) {
            setSource(loadedSources[0].id);
          }
        }
      }
      setLoadingSources(false);
    };
    fetchSources();
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

    const { error } = await supabase.from('transactions').insert({
      type: 'income',
      amount: rawAmount,
      category: source,
      note: note || null,
      transaction_date: new Date().toISOString().split('T')[0],
      week_number,
      week_year,
    });

    if (error) {
      setError('Có lỗi xảy ra, vui lòng thử lại.');
    } else {
      const sourceName = sources.find(s => s.id === source)?.name || source;
      setSuccess(`✅ Đã lưu doanh thu ${amount} đ từ ${sourceName}`);
      setAmount('');
      setNote('');

      // Send Telegram notification
      const msg = `💰 <b>[THU NHẬP MỚI]</b>\nNguồn: <b>${sourceName}</b>\nSố tiền: <b>${amount} đ</b>\n${note ? `Ghi chú: <i>${note}</i>\n` : ''}Thời gian: ${new Date().toLocaleString('vi-VN')}`;
      await sendTelegramNotification(msg);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Ghi nhận Doanh thu</h2>

      <div className="glass-panel">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Nguồn doanh thu</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {loadingSources ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '0.5rem' }}>Đang tải...</div>
              ) : (
                sources.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`btn ${source === s.id ? 'btn-primary' : 'btn-glass'}`}
                    onClick={() => setSource(s.id)}
                    style={source === s.id ? { backgroundColor: s.color, borderColor: s.color } : {}}
                  >
                    {s.name}
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
              placeholder="VD: 500.000"
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
              placeholder="Nhập ghi chú thêm..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
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
            {loading ? 'Đang lưu...' : 'Lưu Doanh Thu'}
          </button>
        </form>
      </div>
    </div>
  );
}
