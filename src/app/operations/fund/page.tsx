"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendTelegramNotification } from '@/app/actions';

export default function FundPage() {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isWithdraw, setIsWithdraw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const supabase = createClient();
  const fmt = (v: string) => parseInt(v.replace(/\D/g, ''), 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = fmt(amount);
    if (!raw) return;
    setLoading(true);
    const { error } = await supabase.from('transactions').insert({
      type: isWithdraw ? 'expense' : 'contribution',
      amount: raw,
      category: 'fund',
      note: note || null,
      transaction_date: new Date().toISOString().split('T')[0],
      is_fund_spent: isWithdraw,
    });
    setLoading(false);
    setMsg(error ? `❌ ${error.message}` : '✅ Lưu giao dịch thành công');
    if (!error) { 
      // Send Telegram notification
      const msgText = isWithdraw ? '🔧 <b>[CHI TỪ QUỸ DỰ PHÒNG]</b>' : '💰 <b>[NẠP QUỸ DỰ PHÒNG]</b>';
      const tgMsg = `${msgText}\nSố tiền: <b>${amount} đ</b>\n${note ? `Ghi chú: <i>${note}</i>\n` : ''}Thời gian: ${new Date().toLocaleString('vi-VN')}`;
      await sendTelegramNotification(tgMsg);

      setAmount(''); 
      setNote(''); 
      setIsWithdraw(false); 
    }
  };

  return (
    <div className="page-transition">
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Ghi nhận Góp / Chi từ Quỹ</h2>
      <form onSubmit={handleSubmit} className="glass-panel">
        <div className="input-group" style={{ marginBottom: '1rem' }}>
          <label className="input-label">Số tiền (VNĐ)</label>
          <input
            type="tel"
            className="input-field"
            placeholder="VD: 5.000.000"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="input-group" style={{ marginBottom: '1rem' }}>
          <label className="input-label">Ghi chú (không bắt buộc)</label>
          <input
            type="text"
            className="input-field"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
        <div className="input-group" style={{ marginBottom: '1rem' }}>
          <input
            type="checkbox"
            id="withdraw"
            checked={isWithdraw}
            onChange={e => setIsWithdraw(e.target.checked)}
          />
          <label htmlFor="withdraw" style={{ marginLeft: '0.5rem' }}>
            Chi trả từ Quỹ dự phòng (giảm Quỹ)
          </label>
        </div>
        {msg && (
          <p style={{ color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', marginBottom: '1rem' }}>{msg}</p>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          Lưu giao dịch
        </button>
      </form>
    </div>
  );
}
