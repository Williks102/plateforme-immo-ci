import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendWhatsApp } from '@/lib/whatsapp';

const schema = z.object({
  reason: z.string().min(10).max(500),
});

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
    const { reason } = schema.parse(await req.json());

    const listingData = await db.query(
      `SELECT l.title, u.whatsapp_number
       FROM listings l
       JOIN users u ON u.id = l.owner_id
       WHERE l.id = $1`,
      [listingId]
    );

    if (listingData.rowCount === 0) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 });
    }

    await db.query(
      `UPDATE listings SET status = 'rejected', rejection_reason = $2, updated_at = NOW()
       WHERE id = $1`,
      [listingId, reason]
    );

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
       VALUES ($1, 'listing.reject', 'listing', $2, $3)`,
      [session.userId, listingId, JSON.stringify({ reason })]
    );

    const listing = listingData.rows[0];
    if (listing.whatsapp_number) {
      await sendWhatsApp(
        listing.whatsapp_number,
        `❌ Votre annonce "${listing.title}" n'a pas été validée.\nMotif : ${reason}\n` +
        `Vous pouvez la corriger et la resoumettre.`
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
