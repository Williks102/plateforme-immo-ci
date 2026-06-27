import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  document_url: z.string().url().max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { document_url } = schema.parse(await req.json());

    await db.query(
      `UPDATE users
       SET kyc_status = 'id_submitted', kyc_document_url = $1
       WHERE id = $2`,
      [document_url, session.userId]
    );

    await logAudit({
      actorId:   session.userId,
      action:    'kyc.submitted',
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('[kyc-submit]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
