import { randomUUID } from 'crypto';

// ── Helpers de normalisation anti-pollution PaiementPro ──────────
function normalizeValue(value: string): string {
  return value.trim().split(/[?&]/)[0].trim();
}

export function normalizeRef(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s.split(/[?&]/)[0].trim() : null;
}

export function getWebhookSecret(query: Record<string, string | string[] | undefined>, body: Record<string, unknown>): string | null {
  const q = query.wh;
  if (typeof q === 'string') return normalizeValue(q);
  if (Array.isArray(q)) return normalizeValue(String(q[0]));

  const b = body?.wh;
  if (typeof b === 'string') return normalizeValue(b);
  if (typeof b === 'number') return String(b);

  return null;
}

// ── Initialisation d'un paiement côté SERVEUR ────────────────────
export async function initiatePaiementPro(params: {
  amount: number;
  bookingId: string;
  customerPhone: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastname: string;
  notificationURL: string;
  returnURL: string;
}): Promise<{ success: boolean; paymentUrl?: string; referenceNumber: string }> {
  const referenceNumber = `IMMO-${params.bookingId.slice(0, 8).toUpperCase()}-${Date.now()}`;

  const response = await fetch('https://www.paiementpro.net/webservice/onlinepayment/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantId:          process.env.PAIEMENTPRO_MERCHANT_ID,
      amount:              params.amount,
      countryCurrencyCode: '952',
      description:         `Réservation ${params.bookingId.slice(0, 8)}`,
      referenceNumber,
      customerEmail:       params.customerEmail,
      customerFirstName:   params.customerFirstName,
      customerLastname:    params.customerLastname,
      customerPhoneNumber: params.customerPhone,
      notificationURL:     params.notificationURL,
      returnURL:           params.returnURL,
      returnContext:       JSON.stringify({ booking_id: params.bookingId }),
    }),
  });

  if (!response.ok) {
    return { success: false, referenceNumber };
  }

  const data = await response.json();
  return {
    success: data.success === true,
    paymentUrl: data.url,
    referenceNumber,
  };
}

// ── Payout propriétaire ──────────────────────────────────────────
export async function paiementProPayout(params: {
  amount: number;
  phone: string;
  description: string;
}): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PaiementPro DEV PAYOUT] ${params.amount} FCFA → ${params.phone}`);
    return;
  }

  const response = await fetch('https://www.paiementpro.net/webservice/payout/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantId:  process.env.PAIEMENTPRO_MERCHANT_ID,
      amount:      params.amount,
      phone:       params.phone,
      description: params.description,
      referenceNumber: `PAYOUT-${randomUUID().slice(0, 8).toUpperCase()}-${Date.now()}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`PaiementPro payout failed: ${response.statusText}`);
  }
}

// ── Construction URL notification avec secret ────────────────────
export function buildWebhookNotificationUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/api/webhooks/paiementpro?token=${token}`;
}
