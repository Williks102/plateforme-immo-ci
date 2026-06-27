import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { getSession, createSession, sessionCookieOptions } from '@/lib/auth';
import { verifyTOTP } from '@/lib/totp';
import { logAudit } from '@/lib/audit';

const schema = z.object({ token: z.string().length(6).regex(/^\d{6}$/) });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { token } = schema.parse(await req.json());

    const result = await db.query(
      'SELECT totp_secret, totp_enabled FROM users WHERE id = $1',
      [session.userId]
    );
    const user = result.rows[0];

    if (!user?.totp_enabled || !user.totp_secret) {
      return NextResponse.json({ error: 'TOTP non configuré' }, { status: 400 });
    }

    // Comparaison timing-safe
    const valid = verifyTOTP(user.totp_secret, token);
    if (!valid) {
      await logAudit({
        actorId: session.userId,
        action: 'auth.totp_failed',
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      });
      return NextResponse.json({ error: 'Code incorrect' }, { status: 401 });
    }

    // Renouveler le JWT avec flag totp_verified
    const newToken = await createSession({
      userId:  session.userId,
      email:   session.email,
      role:    session.role,
    });
    const opts = sessionCookieOptions(newToken);
    const response = NextResponse.json({ success: true });
    response.cookies.set(opts.name, opts.value, {
      httpOnly: opts.httpOnly,
      secure:   opts.secure,
      sameSite: opts.sameSite,
      maxAge:   opts.maxAge,
      path:     opts.path,
    });

    await logAudit({
      actorId:   session.userId,
      action:    'auth.totp_success',
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    });

    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('[verify-totp]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
