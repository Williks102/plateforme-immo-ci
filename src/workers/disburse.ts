import { Pool } from 'pg';
import { paiementProPayout } from '../lib/paiementpro';
import { sendWhatsApp } from '../lib/whatsapp';

const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function disbursePendingPayments() {
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
      // UPDATE atomique — garde-fou idempotent
      const result = await db.query(
        `UPDATE bookings
         SET status = 'disbursed_to_owner', disbursed_at = NOW()
         WHERE id = $1 AND disbursed_at IS NULL
         RETURNING *`,
        [booking.id]
      );

      if ((result.rowCount ?? 0) === 0) {
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
          `✅ Virement reçu : ${Number(booking.montant_proprietaire).toLocaleString()} FCFA`
        );
      }
    } catch (e) {
      await db.query('ROLLBACK');
      console.error(`[DISBURSE] booking=${booking.id}`, e);
      if (process.env.ADMIN_PHONE) {
        await sendWhatsApp(
          process.env.ADMIN_PHONE,
          `Échec versement booking ${booking.id.slice(0, 8)} — voir logs serveur`
        );
      }
    }
  }
}

// Cron toutes les heures
const INTERVAL_MS = 60 * 60 * 1000;

async function run() {
  console.log('[WORKER] Démarrage du worker de disbursement');
  while (true) {
    try {
      await disbursePendingPayments();
    } catch (e) {
      console.error('[WORKER] Erreur globale', e);
    }
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
  }
}

run();
