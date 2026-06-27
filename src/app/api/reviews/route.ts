import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

const schema = z.object({
  booking_id: z.string().uuid(),
  rating:     z.number().int().min(1).max(5),
  comment:    z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { booking_id, rating, comment } = schema.parse(await req.json());

    // Vérification anti-fraude en une requête :
    // - booking appartient au client
    // - séjour terminé (disbursed) + check_out passé
    // - propriétaire du bien ≠ client (pas d'auto-notation)
    // - pas encore d'avis pour ce booking
    const check = await db.query(
      `SELECT b.listing_id FROM bookings b
       JOIN listings l ON l.id = b.listing_id
       WHERE b.id = $1
         AND b.guest_id = $2
         AND b.status = 'disbursed_to_owner'
         AND b.check_out < NOW()
         AND l.owner_id != $2
         AND NOT EXISTS (SELECT 1 FROM reviews WHERE booking_id = b.id)`,
      [booking_id, session.userId]
    );

    if ((check.rowCount ?? 0) === 0) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas laisser d\'avis pour cette réservation' },
        { status: 403 }
      );
    }

    const listing_id = check.rows[0].listing_id;

    await db.query(
      `INSERT INTO reviews (listing_id, booking_id, reviewer_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [listing_id, booking_id, session.userId, rating, comment ?? null]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('[reviews]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

// Signaler un avis
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { review_id } = z.object({ review_id: z.string().uuid() }).parse(await req.json());

    await db.query(
      `UPDATE reviews SET is_visible = FALSE
       WHERE id = $1
         AND reviewer_id != $2`,  // On ne masque pas ses propres avis via ce endpoint
      [review_id, session.userId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
