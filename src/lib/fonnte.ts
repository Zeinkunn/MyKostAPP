export interface WhatsAppMessagePayload {
  target: string; // phone number e.g., "08123456789"
  message: string;
  url?: string;
}

export async function sendWhatsAppMessage(payload: WhatsAppMessagePayload): Promise<boolean> {
  const token = process.env.FONNTE_API_TOKEN;
  if (!token || token === 'mock-fonnte-token') {
    console.log('[MOCK WA SENT] Target:', payload.target, 'Message:', payload.message);
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
    console.log('[FONNTE WA RESPONSE]', result);
    return result.status === true;
  } catch (error) {
    console.error('Failed to send WhatsApp message via Fonnte:', error);
    return false;
  }
}
