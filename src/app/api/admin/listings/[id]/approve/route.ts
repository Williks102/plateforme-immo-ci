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

    // Vérifier que le propriétaire a un KYC vérifié
    const listingData = await db.query(
      `SELECT l.id, l.title, l.owner_id, u.kyc_status, u.whatsapp_number
       FROM listings l
       JOIN users u ON u.id = l.owner_id
       WHERE l.id = $1 AND l.status = 'pending_review'`,
      [listingId]
    );

    if (listingData.rowCount === 0) {
      return NextResponse.json({ error: 'Bien introuvable ou déjà traité' }, { status: 404 });
    }

    const listing = listingData.rows[0];

    if (listing.kyc_status !== 'verified') {
      return NextResponse.json(
        { error: 'Le propriétaire doit compléter la vérification KYC avant publication' },
        { status: 422 }
      );
    }

    await db.query(
      `UPDATE listings SET status = 'published', updated_at = NOW() WHERE id = $1`,
      [listingId]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id)
       VALUES ($1, 'listing.approve', 'listing', $2)`,
      [session.userId, listingId]
    );

    // Notifier le propriétaire
    if (listing.whatsapp_number) {
      await sendWhatsApp(
        listing.whatsapp_number,
        `✅ Votre annonce "${listing.title}" a été validée et est maintenant publiée sur ImmoCI !`
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
