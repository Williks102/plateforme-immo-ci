import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sendSMS } from '@/lib/sms';

const schema = z.object({
  phone: z.string().regex(/^\+225\d{10}$/, 'Numéro ivoirien invalide (+225XXXXXXXXXX)'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = schema.parse(body);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      'UPDATE otp_codes SET used = TRUE WHERE phone = $1 AND used = FALSE',
      [phone]
    );
    await db.query(
      'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
      [phone, code, expiresAt]
    );

    const result = await sendSMS(
      phone,
      `Votre code de connexion ImmoCI : ${code}. Valable 10 minutes.`
    );

    // Mode test (pas de provider SMS) : renvoyer le code dans la réponse
    if (!result.sent) {
      return NextResponse.json({
        success: true,
        _testMode: true,
        _code: result.testCode,
        _notice: 'CONFIGUREZ SMS_PROVIDER_API_KEY pour les SMS réels',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('[send-otp]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
