import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendWhatsApp } from '@/lib/whatsapp';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id: listingId } = await params;

    const listingData = await db.query(
      `SELECT l.title, u.whatsapp_number
       FROM listings l
       JOIN users u ON u.id = l.owner_id
       WHERE l.id = $1 AND l.status = 'published'`,
      [listingId]
    );

    if (listingData.rowCount === 0) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 });
    }

    await db.query(
      `UPDATE listings SET is_verified = TRUE, verified_at = NOW() WHERE id = $1`,
      [listingId]
    );

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id)
       VALUES ($1, 'listing.verified', 'listing', $2)`,
      [session.userId, listingId]
    );

    const listing = listingData.rows[0];
    if (listing.whatsapp_number) {
      await sendWhatsApp(
        listing.whatsapp_number,
        `✅ Votre bien "${listing.title}" a reçu le badge Vérifié ImmoCI ! ` +
        `Il sera mis en avant dans les résultats de recherche.`
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
