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
