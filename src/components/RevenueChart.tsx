'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

interface RevenueChartProps {
  defaultStartDate: string;
  defaultEndDate: string;
}

export default function RevenueChart({ defaultStartDate, defaultEndDate }: RevenueChartProps) {
  const [filterMode, setFilterMode] = useState<'period' | 'custom'>('period');
  const [startDate, setStartDate] = useState(defaultStartDate ? defaultStartDate.split('T')[0] : '');
  const [endDate, setEndDate] = useState(defaultEndDate ? defaultEndDate.split('T')[0] : '');
  const [data, setData] = useState<any[]>([]);
  const [revenueSources, setRevenueSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  // Khi default thay đổi từ bên ngoài (có thể do load dữ liệu cha chậm)
  useEffect(() => {
    if (defaultStartDate && filterMode === 'period') {
      setStartDate(defaultStartDate.split('T')[0]);
    }
    if (defaultEndDate && filterMode === 'period') {
      setEndDate(defaultEndDate.split('T')[0]);
    }
  }, [defaultStartDate, defaultEndDate, filterMode]);

  useEffect(() => {
    async function fetchData() {
      if (!startDate || !endDate) return;
      setLoading(true);

      const sDate = filterMode === 'period' ? defaultStartDate : startDate;
      const eDate = filterMode === 'period' ? defaultEndDate : endDate;

      // Make sure eDate includes the whole day
      const endOfDayStr = new Date(new Date(eDate).setHours(23, 59, 59, 999)).toISOString();
      const startOfDayStr = new Date(new Date(sDate).setHours(0, 0, 0, 0)).toISOString();

      const [txRes, settingsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, type, category, transaction_date')
          .gte('transaction_date', startOfDayStr)
          .lte('transaction_date', endOfDayStr),
        supabase.from('settings').select('revenue_sources').single()
      ]);

      if (txRes.error) {
        console.error('Lỗi khi lấy dữ liệu biểu đồ:', txRes.error);
        setLoading(false);
        return;
      }

      const sources = settingsRes.data?.revenue_sources || [
        { id: 'grab', name: 'Grab', color: '#00b14f' },
        { id: 'ahamove', name: 'Ahamove', color: '#ff6b00' },
        { id: 'lalamove', name: 'Lalamove', color: '#ff8b00' }
      ];
      setRevenueSources(sources);

      // Group theo ngày
      const groupedData: Record<string, any> = {};
      
      txRes.data?.forEach(t => {
        const parsedDate = parseISO(t.transaction_date);
        const dateKey = format(parsedDate, 'dd/MM');
        const sortKey = format(parsedDate, 'yyyy-MM-dd'); // Format chuẩn để sort
        
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = { dateStr: dateKey, sortDate: sortKey, Thu: 0, Chi: 0 };
          sources.forEach((src: any) => {
            groupedData[dateKey][src.id] = 0;
          });
        }
        
        if (t.type === 'income') {
          groupedData[dateKey].Thu += t.amount;
          const isKnownSource = sources.some((s: any) => s.id === t.category);
          if (isKnownSource) {
            groupedData[dateKey][t.category] += t.amount;
          }
        }
        if (t.type === 'expense') groupedData[dateKey].Chi += t.amount;
      });

      // Sort data theo ngày
      const chartData = Object.values(groupedData).sort((a, b) => a.sortDate.localeCompare(b.sortDate));
      
      setData(chartData);
      setLoading(false);
    }
    
    fetchData();
  }, [filterMode, startDate, endDate, defaultStartDate, defaultEndDate, supabase]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const toggleLine = (e: any) => {
    const { dataKey } = e;
    setHiddenLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  return (
    <div className="glass-panel" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Biểu đồ Doanh thu & Chi phí</h3>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', padding: '4px' }}>
            <button 
              onClick={() => setFilterMode('period')}
              className={`btn ${filterMode === 'period' ? 'btn-primary' : 'btn-glass'}`}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Kỳ hiện tại
            </button>
            <button 
              onClick={() => setFilterMode('custom')}
              className={`btn ${filterMode === 'custom' ? 'btn-primary' : 'btn-glass'}`}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Tùy chỉnh
            </button>
          </div>

          {filterMode === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="input-field"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>-</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="input-field"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 350, width: '100%' }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu biểu đồ...</p>
          </div>
        ) : data.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
             <p style={{ color: 'var(--text-secondary)' }}>Không có dữ liệu trong khoảng thời gian này.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis 
                dataKey="dateStr" 
                stroke="var(--text-secondary)" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="var(--text-secondary)" 
                fontSize={12} 
                tickFormatter={(val) => `${val / 1000}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [formatCurrency(Number(value) || 0), name]}
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                itemStyle={{ color: 'white' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle" 
                onClick={toggleLine}
                wrapperStyle={{ cursor: 'pointer' }}
              />
              <Line 
                hide={hiddenLines["Thu"]}
                type="monotone" 
                dataKey="Thu" 
                name="Tổng Doanh thu" 
                stroke="var(--success)" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }} 
              />
              <Line 
                hide={hiddenLines["Chi"]}
                type="monotone" 
                dataKey="Chi" 
                name="Tổng Chi phí" 
                stroke="var(--danger)" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }} 
              />
              {revenueSources.map(src => (
                <Line 
                  key={src.id}
                  hide={hiddenLines[src.id]}
                  type="monotone" 
                  dataKey={src.id} 
                  name={src.name} 
                  stroke={src.color} 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4 }} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
