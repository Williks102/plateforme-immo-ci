import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const schema = z.object({ ban: z.boolean() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id: userId } = await params;
    if (!z.string().uuid().safeParse(userId).success) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    // Impossible de se bannir soi-même
    if (userId === session.userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous bannir vous-même' }, { status: 400 });
    }

    const { ban } = schema.parse(await req.json());

    await db.query('UPDATE users SET is_banned = $1 WHERE id = $2', [ban, userId]);

    await logAudit({
      actorId:    session.userId,
      action:     ban ? 'user.ban' : 'user.unban',
      targetType: 'user',
      targetId:   userId,
      ipAddress:  req.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ success: true, banned: ban });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('[ban]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
