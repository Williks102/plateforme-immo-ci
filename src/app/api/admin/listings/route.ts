import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

const querySchema = z.object({
  status: z.enum(['pending_review', 'published', 'rejected', 'draft']).default('pending_review'),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const q      = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const offset = (q.page - 1) * q.limit;

    const result = await db.query(
      `SELECT l.id, l.title, l.commune, l.quartier, l.prix_nuitee, l.photos,
              l.status, l.is_verified, l.created_at,
              u.full_name as owner_name, u.email as owner_email,
              u.phone as owner_phone, u.kyc_status
       FROM listings l
       JOIN users u ON u.id = l.owner_id
       WHERE l.status = $1
       ORDER BY l.created_at ASC
       LIMIT $2 OFFSET $3`,
      [q.status, q.limit, offset]
    );

    return NextResponse.json({ listings: result.rows, page: q.page, limit: q.limit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
