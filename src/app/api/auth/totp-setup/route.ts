import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateTOTPSecret, buildTOTPUri } from '@/lib/totp';
import QRCode from 'qrcode';

// GET : générer ou récupérer le secret TOTP (admin uniquement)
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const result = await db.query(
    'SELECT totp_secret, totp_enabled FROM users WHERE id = $1',
    [session.userId]
  );
  const user = result.rows[0];

  // Si TOTP déjà activé, ne pas ré-exposer le secret
  if (user.totp_enabled) {
    return NextResponse.json({ enabled: true });
  }

  // Générer un nouveau secret ou réutiliser l'existant
  let secret = user.totp_secret;
  if (!secret) {
    secret = generateTOTPSecret();
    await db.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, session.userId]);
  }

  const uri    = buildTOTPUri(secret, session.email);
  const qrCode = await QRCode.toDataURL(uri);

  return NextResponse.json({ enabled: false, qrCode, secret });
}

// POST : confirmer l'activation du TOTP
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { token } = await req.json();
  if (!token || typeof token !== 'string' || !/^\d{6}$/.test(token)) {
    return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
  }

  const result = await db.query(
    'SELECT totp_secret FROM users WHERE id = $1 AND totp_enabled = FALSE',
    [session.userId]
  );
  if (!result.rows[0]?.totp_secret) {
    return NextResponse.json({ error: 'TOTP déjà activé ou secret absent' }, { status: 409 });
  }

  const { verifyTOTP } = await import('@/lib/totp');
  if (!verifyTOTP(result.rows[0].totp_secret, token)) {
    return NextResponse.json({ error: 'Code incorrect' }, { status: 401 });
  }

  await db.query('UPDATE users SET totp_enabled = TRUE WHERE id = $1', [session.userId]);
  return NextResponse.json({ success: true });
}
