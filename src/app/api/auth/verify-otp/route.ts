import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { timingSafeEqual } from 'crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { createSession, sessionCookieOptions } from '@/lib/auth';

const verifyRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  // Max 5 tentatives par IP par 10 minutes — un code 6 chiffres sans limite = brute force trivial
  limiter: Ratelimit.slidingWindow(5, '10 m'),
});

const schema = z.object({
  phone: z.string().regex(/^\+225\d{10}$/),
  code:  z.string().length(6).regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success } = await verifyRatelimit.limit(`verify_otp:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans 10 minutes.' },
        { status: 429 }
      );
    }

    const { phone, code } = schema.parse(await req.json());

    const result = await db.query(
      'SELECT code FROM otp_codes WHERE phone = $1 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [phone]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 401 });
    }

    // Comparaison en temps constant — insensible aux timing attacks
    const submittedBuffer = Buffer.from(code.padEnd(6, '0'));
    const storedBuffer    = Buffer.from(result.rows[0].code.padEnd(6, '0'));
    const isValid = timingSafeEqual(submittedBuffer, storedBuffer);

    if (!isValid) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 401 });
    }

    await db.query('UPDATE otp_codes SET used = TRUE WHERE phone = $1 AND used = FALSE', [phone]);

    // Créer ou retrouver l'utilisateur
    const user = await db.query(
      `INSERT INTO users (phone) VALUES ($1)
       ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
       RETURNING id, role, is_banned`,
      [phone]
    );

    if (user.rows[0].is_banned) {
      return NextResponse.json({ error: 'Compte suspendu' }, { status: 403 });
    }

    const session = await createSession({
      userId: user.rows[0].id,
      email: phone, // OTP désactivé — phone stocké dans email temporairement
      role: user.rows[0].role,
    });

    const response = NextResponse.json({
      success: true,
      role: user.rows[0].role,
    });

    const opts = sessionCookieOptions(session);
    response.cookies.set(opts.name, opts.value, {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      maxAge: opts.maxAge,
      path: opts.path,
    });

    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('[verify-otp]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
