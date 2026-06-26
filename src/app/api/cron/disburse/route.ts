import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { paiementProPayout } from '@/lib/paiementpro';
import { sendWhatsApp } from '@/lib/whatsapp';

// Protection du cron — accessible uniquement avec le secret Render
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.NEXTAUTH_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  await disbursePendingPayments();
  return NextResponse.json({ ok: true });
}

export async function disbursePendingPayments() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const bookings = await db.query(
    `SELECT b.id, b.montant_proprietaire, b.check_in,
            u.whatsapp_number as owner_whatsapp
     FROM bookings b
     JOIN listings l ON l.id = b.listing_id
     JOIN users u ON u.id = l.owner_id
     WHERE b.status = 'checked_in'
       AND b.checked_in_at <= $1
       AND b.disbursed_at IS NULL`,
    [cutoff]
  );

  console.log(`[DISBURSE] ${bookings.rowCount} versements à traiter`);

  for (const booking of bookings.rows) {
    await db.query('BEGIN');
    try {
      // UPDATE atomique avec garde-fou idempotent
      const result = await db.query(
        `UPDATE bookings
         SET status = 'disbursed_to_owner', disbursed_at = NOW()
         WHERE id = $1 AND disbursed_at IS NULL
         RETURNING *`,
        [booking.id]
      );

      if (result.rowCount === 0) {
        await db.query('ROLLBACK');
        continue;
      }

      await paiementProPayout({
        amount:      Number(booking.montant_proprietaire),
        phone:       booking.owner_whatsapp,
        description: `Séjour du ${booking.check_in}`,
      });

      await db.query('COMMIT');

      if (booking.owner_whatsapp) {
        await sendWhatsApp(
          booking.owner_whatsapp,
          `✅ Virement effectué. Montant : ${Number(booking.montant_proprietaire).toLocaleString()} FCFA`
        );
      }
    } catch (e) {
      await db.query('ROLLBACK');
      // Logger sans exposer les données sensibles
      console.error(`[DISBURSE] booking=${booking.id}`, e);
      await sendWhatsApp(
        process.env.ADMIN_PHONE!,
        `Échec versement booking ${booking.id.slice(0, 8)} — voir logs serveur`
      );
    }
  }
}
