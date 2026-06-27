import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const result = await db.query(
    'SELECT id, full_name, email, phone, role, kyc_status, created_at FROM users WHERE id = $1',
    [session.userId]
  );

  if (result.rowCount === 0) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  return NextResponse.json({ user: result.rows[0] });
}

const updateSchema = z.object({
  full_name:        z.string().min(2).max(100).optional(),
  phone:            z.string().max(20).optional(),
  current_password: z.string().optional(),
  new_password:     z.string().min(8).max(100).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = updateSchema.parse(await req.json());

    // Si changement de mot de passe, vérifier l'ancien
    if (body.new_password) {
      if (!body.current_password) {
        return NextResponse.json({ error: 'Mot de passe actuel requis' }, { status: 400 });
      }
      const userRow = await db.query('SELECT password_hash FROM users WHERE id = $1', [session.userId]);
      const valid   = await bcrypt.compare(body.current_password, userRow.rows[0]?.password_hash ?? '');
      if (!valid) return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (body.full_name !== undefined) { updates.push(`full_name = $${idx++}`); values.push(body.full_name); }
    if (body.phone     !== undefined) { updates.push(`phone = $${idx++}`);     values.push(body.phone);     }
    if (body.new_password)            {
      const hash = await bcrypt.hash(body.new_password, 12);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    if (updates.length === 0) return NextResponse.json({ error: 'Aucun champ à modifier' }, { status: 400 });

    values.push(session.userId);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, values);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('[profil PATCH]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
