import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession, sessionCookieOptions } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

// Rate-limiter optionnel — uniquement si Upstash est configuré
async function checkRateLimit(ip: string): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return true; // pas de limiter → autorisé
  }
  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');
    const ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '10 m'),
    });
    const { success } = await ratelimit.limit(`login:${ip}`);
    return success;
  } catch (e) {
    console.warn('[login] rate-limit indisponible:', e);
    return true; // en cas d'erreur Redis, on laisse passer
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 10 minutes.' }, { status: 429 });
    }

    const { email, password } = schema.parse(await req.json());

    const result = await db.query(
      'SELECT id, password_hash, role, is_banned FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const INVALID_MSG = 'Email ou mot de passe incorrect';

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: INVALID_MSG }, { status: 401 });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return NextResponse.json({ error: INVALID_MSG }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: INVALID_MSG }, { status: 401 });
    }

    if (user.is_banned) {
      return NextResponse.json({ error: 'Compte suspendu' }, { status: 403 });
    }

    const token = await createSession({ userId: user.id, email: email.toLowerCase(), role: user.role });
    const opts = sessionCookieOptions(token);

    const response = NextResponse.json({ success: true, role: user.role });
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
    console.error('[login]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
