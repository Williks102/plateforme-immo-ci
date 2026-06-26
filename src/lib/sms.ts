export async function sendSMS(phone: string, message: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER ?? 'africas_talking';

  if (process.env.NODE_ENV === 'development') {
    console.log(`[SMS DEV] → ${phone}: ${message}`);
    return;
  }

  if (provider === 'africas_talking') {
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey: process.env.SMS_PROVIDER_API_KEY!,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: process.env.SMS_PROVIDER_USERNAME!,
        to: phone,
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`SMS failed: ${response.statusText}`);
    }
    return;
  }

  throw new Error(`Unknown SMS provider: ${provider}`);
}
