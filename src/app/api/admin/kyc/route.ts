import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// GET : liste des KYC en attente
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const result = await db.query(
    `SELECT id, email, kyc_status, kyc_document_url, created_at
     FROM users
     WHERE kyc_status = 'id_submitted'
     ORDER BY created_at ASC`
  );

  return NextResponse.json({ users: result.rows });
}

// PATCH : approuver ou rejeter un KYC
const schema = z.object({
  user_id: z.string().uuid(),
  action:  z.enum(['approve', 'reject']),
  reason:  z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { user_id, action, reason } = schema.parse(await req.json());

    const newStatus = action === 'approve' ? 'verified' : 'rejected';

    await db.query(
      `UPDATE users
       SET kyc_status = $1, kyc_reviewed_at = NOW(), kyc_reviewed_by = $2
       WHERE id = $3`,
      [newStatus, session.userId, user_id]
    );

    await logAudit({
      actorId:    session.userId,
      action:     `kyc.${action}`,
      targetType: 'user',
      targetId:   user_id,
      metadata:   reason ? { reason } : undefined,
      ipAddress:  req.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('[kyc]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
