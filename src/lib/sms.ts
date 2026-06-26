export type SMSResult =
  | { sent: true }
  | { sent: false; testCode: string };

export async function sendSMS(phone: string, message: string): Promise<SMSResult> {
  // Mode dev local
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SMS DEV] → ${phone}: ${message}`);
    return { sent: true };
  }

  const apiKey = process.env.SMS_PROVIDER_API_KEY;
  const username = process.env.SMS_PROVIDER_USERNAME;

  // Mode test : pas de clé API configurée → OTP dans les logs Render
  if (!apiKey || !username) {
    const code = message.match(/\d{6}/)?.[0] ?? '——';
    console.warn(`[SMS TEST - PAS DE PROVIDER] → ${phone}: ${message}`);
    // Retourner le code pour affichage direct en test
    return { sent: false, testCode: code };
  }

  const provider = process.env.SMS_PROVIDER ?? 'africas_talking';

  if (provider === 'africas_talking') {
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ username, to: phone, message }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SMS failed (${response.status}): ${text}`);
    }
    return { sent: true };
  }

  throw new Error(`Unknown SMS provider: ${provider}`);
}
