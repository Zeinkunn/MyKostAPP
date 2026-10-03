export interface WhatsAppMessagePayload {
  target: string; // phone number e.g., "08123456789"
  message: string;
  url?: string;
}

export async function sendWhatsAppMessage(payload: WhatsAppMessagePayload): Promise<boolean> {
  const token = process.env.FONNTE_API_TOKEN;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!token || token === 'mock-fonnte-token' || token === 'your-fonnte-token-here') {
    if (isProduction) {
      console.error(
        '[FONNTE_ERROR] FONNTE_API_TOKEN tidak diset di production! Pesan WhatsApp ke',
        payload.target,
        'gagal dikirim.'
      );
      return false;
    }
    console.log('[DEV_MOCK_WA_SENT] Target:', payload.target, 'Message:\n', payload.message);
    return true;
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: payload.target,
        message: payload.message,
        url: payload.url,
      }),
    });

    const result = await response.json();
    return result.status === true;
  } catch (error) {
    console.error('Failed to send WhatsApp message via Fonnte:', error);
    return false;
  }
}
