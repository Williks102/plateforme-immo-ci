import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

const querySchema = z.object({
  action:   z.string().max(100).optional(),
  actor_id: z.string().uuid().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const q = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const offset = (q.page - 1) * q.limit;

    const result = await db.query(
      `SELECT al.id, al.action, al.target_type, al.target_id,
              al.metadata, al.ip_address, al.created_at,
              u.email as actor_email
       FROM audit_logs al
       JOIN users u ON u.id = al.actor_id
       WHERE ($1::text IS NULL OR al.action ILIKE '%' || $1 || '%')
         AND ($2::uuid IS NULL OR al.actor_id = $2)
       ORDER BY al.created_at DESC
       LIMIT $3 OFFSET $4`,
      [q.action ?? null, q.actor_id ?? null, q.limit, offset]
    );

    return NextResponse.json({ logs: result.rows, page: q.page, limit: q.limit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
