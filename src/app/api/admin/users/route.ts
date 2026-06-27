import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

const querySchema = z.object({
  search: z.string().max(200).optional(),
  role:   z.enum(['client', 'proprietaire', 'admin']).optional(),
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
      `SELECT id, full_name, email, phone, role, kyc_status,
              is_banned, created_at,
              (SELECT COUNT(*) FROM listings WHERE owner_id = users.id) as listing_count,
              (SELECT COUNT(*) FROM bookings WHERE client_id = users.id) as booking_count
       FROM users
       WHERE ($1::text IS NULL OR email ILIKE '%' || $1 || '%'
                               OR full_name ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR role = $2)
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [q.search ?? null, q.role ?? null, q.limit, offset]
    );

    const total = await db.query(
      `SELECT COUNT(*) FROM users
       WHERE ($1::text IS NULL OR email ILIKE '%' || $1 || '%'
                               OR full_name ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR role = $2)`,
      [q.search ?? null, q.role ?? null]
    );

    return NextResponse.json({
      users: result.rows,
      total: Number(total.rows[0].count),
      page:  q.page,
      limit: q.limit,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
