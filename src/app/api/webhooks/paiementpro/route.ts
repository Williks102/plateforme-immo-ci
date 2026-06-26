import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendWhatsApp } from '@/lib/whatsapp';
import { normalizeRef } from '@/lib/paiementpro';

export async function POST(req: NextRequest) {
  // ══════════════════════════════════════════════════════
  // COUCHE 1 : Token URL à usage unique (remplace le HMAC)
  // ══════════════════════════════════════════════════════
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
  }

  // Récupérer ET invalider le token en une seule opération atomique
  const tokenResult = await db.query(
    `UPDATE payment_callback_tokens
     SET used = TRUE
     WHERE token = $1
       AND used = FALSE
       AND expires_at > NOW()
     RETURNING booking_id`,
    [token]
  );

  if (tokenResult.rowCount === 0) {
    console.warn(`[WEBHOOK] Token invalide reçu: ${token.slice(0, 8)}...`);
    return NextResponse.json({ ok: true }); // 200 pour éviter les retries
  }

  const bookingId = tokenResult.rows[0].booking_id;
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // ══════════════════════════════════════════════════════
  // COUCHE 2 : Idempotence
  // ══════════════════════════════════════════════════════
  const ref = normalizeRef(
    payload.referenceNumber ?? payload.reference ?? payload.reference_number
    ?? payload.ref_command ?? payload.transaction_id ?? payload.id
  );

  if (ref) {
    const existing = await db.query(
      `SELECT id FROM payments WHERE provider_tx_id = $1 AND status = 'success'`,
      [ref]
    );
    if (existing.rowCount! > 0) {
      return NextResponse.json({ already_processed: true });
    }
  }

  // ══════════════════════════════════════════════════════
  // COUCHE 3 : Vérification du montant (anti-injection de prix)
  // ══════════════════════════════════════════════════════
  const booking = await db.query(
    'SELECT total_price, status FROM bookings WHERE id = $1',
    [bookingId]
  );

  if (booking.rowCount === 0) {
    return NextResponse.json({ ok: true });
  }

  const expectedAmount = Number(booking.rows[0].total_price);
  const receivedAmount = Number(payload.amount);

  if (receivedAmount && Math.abs(receivedAmount - expectedAmount) > 1) {
    await db.query(`UPDATE bookings SET status = 'flagged_fraud' WHERE id = $1`, [bookingId]);
    await db.query(
      `UPDATE payments SET status = 'failed', webhook_payload = $2 WHERE booking_id = $1`,
      [bookingId, JSON.stringify(payload)]
    );
    await sendWhatsApp(
      process.env.ADMIN_PHONE!,
      `🚨 FRAUDE DÉTECTÉE\nBooking: ${bookingId.slice(0, 8)}\n` +
      `Attendu: ${expectedAmount} FCFA | Reçu: ${receivedAmount} FCFA`
    );
    return NextResponse.json({ ok: true });
  }

  // Détection du statut
  const rawCode = payload.responsecode ?? payload.response_code ?? payload.responseCode;
  const numericCode = rawCode != null && rawCode !== ''
    ? Number(String(rawCode).replace(/[^0-9\-]/g, ''))
    : null;

  let isSuccess: boolean;
  if (numericCode !== null && !Number.isNaN(numericCode)) {
    isSuccess = numericCode === 0;
  } else {
    const status = String(
      payload.status ?? payload.response_code ?? payload.statut ?? ''
    ).toLowerCase();
    isSuccess = status === 'success' || status === 'paid' || payload.success === true;
  }

  if (!isSuccess) {
    await db.query(
      `UPDATE payments SET status = 'failed', webhook_payload = $2 WHERE booking_id = $1`,
      [bookingId, JSON.stringify(payload)]
    );
    return NextResponse.json({ ok: true });
  }

  // ── Confirmer la réservation ────────────────────────
  if (booking.rows[0].status === 'pending') {
    await db.query('BEGIN');
    try {
      await db.query(
        `UPDATE bookings SET status = 'paid', paid_at = NOW() WHERE id = $1`,
        [bookingId]
      );
      await db.query(
        `UPDATE payments
         SET status = 'success', provider_tx_id = $2, webhook_payload = $3, webhook_received_at = NOW()
         WHERE booking_id = $1`,
        [bookingId, ref, JSON.stringify(payload)]
      );

      // Bloc de disponibilité permanent
      await db.query(
        `INSERT INTO availability_blocks (listing_id, start_date, end_date, reason, booking_id)
         SELECT listing_id, check_in, check_out, 'booking', id
         FROM bookings WHERE id = $1`,
        [bookingId]
      );

      await db.query('COMMIT');

      // Notifications WhatsApp
      const fullBooking = await db.query(
        `SELECT b.check_in, b.check_out, b.total_price,
                uc.phone as client_phone, uc.whatsapp_number as client_wa,
                up.whatsapp_number as owner_wa,
                l.title as listing_title
         FROM bookings b
         JOIN listings l ON l.id = b.listing_id
         JOIN users uc ON uc.id = b.client_id
         JOIN users up ON up.id = l.owner_id
         WHERE b.id = $1`,
        [bookingId]
      );

      const fb = fullBooking.rows[0];
      if (fb) {
        await sendWhatsApp(
          fb.client_wa ?? fb.client_phone,
          `✅ Réservation confirmée !\n${fb.listing_title}\n` +
          `Du ${fb.check_in} au ${fb.check_out}\n` +
          `Montant payé : ${Number(fb.total_price).toLocaleString()} FCFA`
        );
        if (fb.owner_wa) {
          await sendWhatsApp(
            fb.owner_wa,
            `🏠 Nouvelle réservation confirmée !\n${fb.listing_title}\n` +
            `Du ${fb.check_in} au ${fb.check_out}\n` +
            `Montant en séquestre : ${Number(fb.total_price).toLocaleString()} FCFA`
          );
        }
      }
    } catch (e) {
      await db.query('ROLLBACK');
      console.error(`[WEBHOOK] Erreur confirmation booking=${bookingId}`, e);
    }
  }

  return NextResponse.json({ ok: true });
}

// Preflight CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.PAYMENT_PRO_CALLBACK_ORIGIN ?? 'https://paiementpro.net',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-PaiementPro-Signature',
    },
  });
}
