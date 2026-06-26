import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession, sessionCookieOptions } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Mot de passe trop court (8 caractères minimum)')
    .max(72, 'Mot de passe trop long'),
  role: z.enum(['client', 'proprietaire']).default('client'),
});

export async function POST(req: NextRequest) {
  try {
    const { email, password, role } = schema.parse(await req.json());

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if ((existing.rowCount ?? 0) > 0) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, role`,
      [email.toLowerCase(), passwordHash, role]
    );

    const user = result.rows[0];
    const token = await createSession({ userId: user.id, email: email.toLowerCase(), role: user.role });
    const opts = sessionCookieOptions(token);

    const response = NextResponse.json({ success: true, role: user.role }, { status: 201 });
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
    console.error('[register]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
