"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendTelegramNotification } from '@/app/actions';

export default function FundPage() {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isWithdraw, setIsWithdraw] = useState(false);
  const [contributor, setContributor] = useState<'owner' | 'driver'>('owner');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const supabase = createClient();
  const fmt = (v: string) => parseInt(v.replace(/\D/g, ''), 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = fmt(amount);
    if (!raw) return;
    setLoading(true);

    const prefix = isWithdraw ? '' : (contributor === 'owner' ? '[Chủ đầu tư đóng tiền túi]' : '[Tài xế đóng tiền túi]');
    const finalNote = isWithdraw ? note : (note ? `${prefix} ${note}` : prefix);

    const { error } = await supabase.from('transactions').insert({
      type: isWithdraw ? 'expense' : 'contribution',
      amount: raw,
      category: 'fund',
      note: finalNote || null,
      transaction_date: new Date().toISOString().split('T')[0],
      is_fund_spent: isWithdraw,
    });
    setLoading(false);
    setMsg(error ? `❌ ${error.message}` : '✅ Lưu giao dịch thành công');
    if (!error) { 
      // Send Telegram notification
      const msgText = isWithdraw ? '🔧 <b>[CHI TỪ QUỸ DỰ PHÒNG]</b>' : `💰 <b>[NẠP QUỸ DỰ PHÒNG] - ${contributor === 'owner' ? 'Chủ đầu tư' : 'Tài xế'}</b>`;
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
        
        {!isWithdraw && (
          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="input-label">Nguồn tiền đóng góp</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="contributor"
                  checked={contributor === 'owner'}
                  onChange={() => setContributor('owner')}
                />
                Chủ đầu tư đóng tiền túi
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="contributor"
                  checked={contributor === 'driver'}
                  onChange={() => setContributor('driver')}
                />
                Tài xế đóng tiền túi
              </label>
            </div>
          </div>
        )}

        <div className="input-group" style={{ marginBottom: '1rem' }}>
          <input
            type="checkbox"
            id="withdraw"
            checked={isWithdraw}
            onChange={e => setIsWithdraw(e.target.checked)}
          />
          <label htmlFor="withdraw" style={{ marginLeft: '0.5rem', cursor: 'pointer' }}>
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
