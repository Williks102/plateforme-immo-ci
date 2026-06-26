import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { sendSMS } from '@/lib/sms';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  // Max 3 SMS par téléphone par heure — anti-spam facture SMS
  limiter: Ratelimit.slidingWindow(3, '1 h'),
});

const schema = z.object({
  phone: z.string().regex(/^\+225\d{10}$/, 'Numéro ivoirien invalide (+225XXXXXXXXXX)'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = schema.parse(body);

    // Rate limiting par numéro de téléphone
    const { success } = await ratelimit.limit(`send_otp:${phone}`);
    if (!success) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans 1 heure.' },
        { status: 429 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalider les anciens codes non utilisés
    await db.query(
      'UPDATE otp_codes SET used = TRUE WHERE phone = $1 AND used = FALSE',
      [phone]
    );

    await db.query(
      'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
      [phone, code, expiresAt]
    );

    await sendSMS(phone, `Votre code de connexion ImmoCI : ${code}. Valable 10 minutes.`);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error('[send-otp]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
