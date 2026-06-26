export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WhatsApp DEV] → ${phone}: ${message}`);
    return;
  }

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token   = process.env.WHATSAPP_API_TOKEN;
  if (!phoneId || !token) return;

  // Normaliser le numéro (enlever le +)
  const to = phone.replace(/^\+/, '');

  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  });
}

export async function notifyAdmin(params: { message: string; listing_url?: string }) {
  const adminPhone = process.env.ADMIN_PHONE;
  if (!adminPhone) return;
  const text = params.listing_url
    ? `${params.message}\n${params.listing_url}`
    : params.message;
  await sendWhatsApp(adminPhone, text);
}
