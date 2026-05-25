'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const supabase = createClient();
  const [revenueSources, setRevenueSources] = useState<string>('');
  const [defaultDeduction, setDefaultDeduction] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Load existing settings
  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('settings').select('revenue_sources, default_fund_deduction').single();
      if (data) {
        setRevenueSources(JSON.stringify(data.revenue_sources || []));
        setDefaultDeduction(data.default_fund_deduction ?? 0);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  const handleSave = async () => {
    try {
      const sources = JSON.parse(revenueSources);
      const { error } = await supabase.from('settings').upsert({
        id: 1,
        revenue_sources: sources,
        default_fund_deduction: defaultDeduction,
      });
      if (error) throw error;
      setMessage('✅ Lưu cài đặt thành công');
    } catch (e) {
      setMessage('❌ Lưu thất bại: ' + (e as Error).message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="glass-panel" style={{ padding: '1rem', maxWidth: '600px', margin: 'auto' }}>
      <h2>Thiết lập</h2>
      <div style={{ marginBottom: '1rem' }}>
        <label>Danh sách nguồn doanh thu (JSON array):</label>
        <textarea
          rows={4}
          style={{ width: '100%' }}
          value={revenueSources}
          onChange={e => setRevenueSources(e.target.value)}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Số tiền trích quỹ mặc định (VND):</label>
        <input
          type="number"
          value={defaultDeduction}
          onChange={e => setDefaultDeduction(parseInt(e.target.value) || 0)}
          style={{ width: '100%' }}
        />
      </div>
      <button className="btn btn-primary" onClick={handleSave}>Lưu cài đặt</button>
      {message && <p>{message}</p>}
    </div>
  );
}
