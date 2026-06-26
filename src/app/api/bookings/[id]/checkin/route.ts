import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// POST /api/bookings/[id]/checkin — réservé au propriétaire du bien
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    if (session.role !== 'proprietaire' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id: bookingId } = await params;

    // Vérifier que le booking appartient à un listing du session.userId
    // checked_in_at non modifiable directement — route dédiée avec audit log
    const booking = await db.query(
      `SELECT b.id, b.check_in, b.checked_in_at, b.status
       FROM bookings b
       JOIN listings l ON l.id = b.listing_id
       WHERE b.id = $1 AND l.owner_id = $2`,
      [bookingId, session.userId]
    );

    if (booking.rowCount === 0) {
      return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
    }

    const b = booking.rows[0];

    if (b.checked_in_at !== null) {
      return NextResponse.json({ error: 'Check-in déjà effectué' }, { status: 409 });
    }

    if (b.status !== 'paid') {
      return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 422 });
    }

    // Vérifier que la date actuelle >= check_in - 1 jour
    const checkInDate = new Date(b.check_in);
    checkInDate.setDate(checkInDate.getDate() - 1);
    if (new Date() < checkInDate) {
      return NextResponse.json({ error: 'Check-in trop anticipé' }, { status: 422 });
    }

    await db.query(
      `UPDATE bookings SET checked_in_at = NOW(), status = 'checked_in' WHERE id = $1`,
      [bookingId]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id)
       VALUES ($1, 'booking.checkin', 'booking', $2)`,
      [session.userId, bookingId]
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
