'use server';

export async function sendTelegramNotification(message: string) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.log('Telegram not configured, skipping notification.');
      return { success: false, error: 'Telegram not configured' };
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      console.error('Failed to send Telegram message:', await response.text());
      return { success: false, error: 'Failed to send' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return { success: false, error: 'Network error' };
  }
}

import { createClient } from '@/lib/supabase/server';

export async function cleanTestData() {
  const supabase = createClient();
  
  // Xóa tất cả các giao dịch có chứa chữ [TEST] trong ghi chú
  const { error: txError } = await supabase.from('transactions')
    .delete()
    .ilike('note', '%[TEST]%');
    
  if (txError) {
    return { success: false, error: txError.message };
  }
  
  // Tùy chọn: Chúng ta cũng có thể tìm các weekly_settlements không có giao dịch nào và xóa chúng,
  // nhưng hiện tại xóa transaction là đủ để làm sạch biểu đồ.
  
  return { success: true };
}