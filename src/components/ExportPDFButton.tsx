'use client';

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ExportPDFButtonProps {
  settlement: any;
  incomes: any[];
  expenses: any[];
  funds: any[];
  revenueSources: any[];
  expenseCategories: any[];
}

export default function ExportPDFButton({
  settlement, incomes, expenses, funds, revenueSources, expenseCategories
}: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const getCategoryName = (id: string, isIncome: boolean) => {
    if (isIncome) {
      const src = revenueSources.find((s: any) => s.id === id);
      return src ? src.name : id;
    } else {
      const cat = expenseCategories.find((c: any) => c.id === id);
      return cat ? `${cat.name}` : id;
    }
  };

  const fmt = (n: number) => n?.toLocaleString('vi-VN');

  const periodLabel = settlement.start_date && settlement.end_date
    ? `Từ ngày ${new Date(settlement.start_date).toLocaleDateString('vi-VN')} đến ${new Date(settlement.end_date).toLocaleDateString('vi-VN')}`
    : `Tuần ${settlement.week_number} / Năm ${settlement.week_year}`;

  const handleExport = async () => {
    if (!pdfRef.current) return;
    setIsExporting(true);

    try {
      const element = pdfRef.current;
      
      // html2canvas render options
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `Bao_Cao_Chot_So_${settlement.start_date ? settlement.start_date : 'T' + settlement.week_number}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Lỗi xuất PDF:', error);
      alert('Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleExport} 
        disabled={isExporting}
        className="btn" 
        style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
      >
        {isExporting ? '⏳ Đang xử lý...' : '📄 Xuất PDF'}
      </button>

      {/* Vùng Render Hóa Đơn Ẩn */}
      <div style={{ overflow: 'hidden', height: 0, width: 0, position: 'absolute', zIndex: -9999 }}>
        <div 
          ref={pdfRef} 
          style={{ 
            width: '210mm', // A4 width
            minHeight: '297mm', // A4 height
            padding: '20mm', 
            background: '#ffffff', 
            color: '#000000', 
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #000', paddingBottom: '15px' }}>
            <h1 style={{ fontSize: '28px', margin: 0, textTransform: 'uppercase', color: '#111' }}>BÁO CÁO CHỐT SỔ VẬN HÀNH XE</h1>
            <p style={{ margin: '8px 0 4px 0', fontSize: '16px', fontWeight: 'bold' }}>{periodLabel}</p>
            <p style={{ margin: '0', fontSize: '14px', color: '#555' }}>Ngày chốt: {new Date(settlement.created_at).toLocaleString('vi-VN')}</p>
          </div>

          {/* Summary Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>Tổng Doanh Thu:</p>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#16a34a' }}>+ {fmt(settlement.total_income)} VNĐ</h2>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>Tổng Chi Phí:</p>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#dc2626' }}>- {fmt(settlement.total_expense + (settlement.fixed_costs || 0))} VNĐ</h2>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>LỢI NHUẬN RÒNG:</p>
              <h2 style={{ margin: 0, fontSize: '24px', color: settlement.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>
                {settlement.net_profit >= 0 ? '+' : ''}{fmt(settlement.net_profit)} VNĐ
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Thu Nhập */}
            <div>
              <h3 style={{ fontSize: '16px', borderBottom: '1px solid #16a34a', color: '#16a34a', paddingBottom: '5px', marginBottom: '15px' }}>I. BẢNG KÊ DOANH THU</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', width: '15%' }}>Ngày</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', width: '60%' }}>Nguồn / Ghi chú</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', width: '25%' }}>Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.length > 0 ? incomes.map((t, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', verticalAlign: 'top' }}>{new Date(t.transaction_date).toLocaleDateString('vi-VN')}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', verticalAlign: 'top' }}>
                        <strong>{getCategoryName(t.category, true)}</strong>
                        {t.note && <span style={{ color: '#555', display: 'block', marginTop: '2px' }}>{t.note}</span>}
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top' }}>{fmt(t.amount)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Không có phát sinh</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Chi Phí */}
            <div>
              <h3 style={{ fontSize: '16px', borderBottom: '1px solid #dc2626', color: '#dc2626', paddingBottom: '5px', marginBottom: '15px' }}>II. BẢNG KÊ CHI PHÍ</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', width: '15%' }}>Ngày</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', width: '60%' }}>Mục chi / Ghi chú</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', width: '25%' }}>Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length > 0 ? expenses.map((t, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', verticalAlign: 'top' }}>{new Date(t.transaction_date).toLocaleDateString('vi-VN')}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', verticalAlign: 'top' }}>
                        <strong>{getCategoryName(t.category, false)}</strong>
                        {t.note && <span style={{ color: '#555', display: 'block', marginTop: '2px' }}>{t.note}</span>}
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top' }}>{fmt(t.amount)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Không có phát sinh</td></tr>
                  )}
                </tbody>
              </table>

              {funds.length > 0 && (
                <>
                  <h3 style={{ fontSize: '14px', marginTop: '20px', color: '#b45309' }}>* Đã chi từ Quỹ dự phòng</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <tbody>
                      {funds.map((t, i) => (
                        <tr key={i}>
                          <td style={{ padding: '6px 8px', border: '1px solid #ddd', width: '15%', verticalAlign: 'top' }}>{new Date(t.transaction_date).toLocaleDateString('vi-VN')}</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #ddd', width: '60%', verticalAlign: 'top' }}>
                            <strong>{getCategoryName(t.category, false)}</strong>
                            {t.note && <span style={{ color: '#555', display: 'block', marginTop: '2px' }}>{t.note}</span>}
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#b45309', width: '25%', verticalAlign: 'top' }}>{fmt(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>

          {/* Allocation */}
          <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', margin: '0 0 15px 0', color: '#0f172a', textAlign: 'center' }}>KẾT QUẢ PHÂN BỔ LỢI NHUẬN</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#475569' }}>Tiền chia cho GÓC ĐẦU TƯ</p>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>{fmt(settlement.owner_amount || 0)} VNĐ</h2>
              </div>
              <div style={{ width: '1px', background: '#cbd5e1' }}></div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#475569' }}>Tiền chia cho GÓC VẬN HÀNH</p>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>{fmt(settlement.driver_amount || 0)} VNĐ</h2>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0 0 80px 0' }}>ĐẠI DIỆN VẬN HÀNH</p>
              <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>(Ký và ghi rõ họ tên)</p>
            </div>
            <div>
              <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0 0 80px 0' }}>ĐẠI DIỆN ĐẦU TƯ</p>
              <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>(Ký và ghi rõ họ tên)</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
