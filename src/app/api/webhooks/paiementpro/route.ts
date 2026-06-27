import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendWhatsApp } from '@/lib/whatsapp';
import { normalizeRef } from '@/lib/paiementpro';

// PaiementPro peut notifier en GET ou POST, en JSON, en form-urlencoded
// ou via query string (avec parfois un '?' parasite). On fusionne tout.
async function extractParams(req: NextRequest): Promise<Record<string, unknown>> {
  const params: Record<string, unknown> = {};
  req.nextUrl.searchParams.forEach((v, k) => { params[k] = v; });

  const ct = req.headers.get('content-type') ?? '';
  try {
    if (ct.includes('application/json')) {
      Object.assign(params, await req.json());
    } else if (ct.includes('form')) {
      (await req.formData()).forEach((v, k) => { params[k] = v; });
    } else {
      const raw = await req.text();
      if (raw) {
        try { Object.assign(params, JSON.parse(raw)); }
        catch { new URLSearchParams(raw).forEach((v, k) => { params[k] = v; }); }
      }
    }
  } catch { /* corps illisible : on garde les paramètres d'URL */ }

  return params;
}

async function handle(req: NextRequest) {
  const params = await extractParams(req);

  // ── Identifier le booking : 3 canaux, du plus fiable au plus fragile ──
  let bookingId: string | null = null;

  // a) returnContext (renvoyé tel quel par PaiementPro)
  const rc = params.returnContext ?? params.returncontext;
  if (typeof rc === 'string' && rc) {
    try { bookingId = (JSON.parse(rc) as { booking_id?: string })?.booking_id ?? null; } catch { /* noop */ }
  }

  // b) referenceNumber → payments.provider_tx_id
  const ref = normalizeRef(
    params.referenceNumber ?? params.reference ?? params.reference_number ?? params.ref_command,
  );
  if (!bookingId && ref) {
    const r = await db.query('SELECT booking_id FROM payments WHERE provider_tx_id = $1', [ref]);
    bookingId = r.rows[0]?.booking_id ?? null;
  }

  // c) token d'URL — normalisé contre le '?' parasite de PaiementPro
  const token = normalizeRef(params.token);
  if (!bookingId && token) {
    const r = await db.query(
      'SELECT booking_id FROM payment_callback_tokens WHERE token = $1 AND expires_at > NOW()',
      [token],
    );
    bookingId = r.rows[0]?.booking_id ?? null;
  }

  if (!bookingId) {
    console.warn('[WEBHOOK] Booking introuvable', { ref, hasToken: !!token });
    return NextResponse.json({ ok: true }); // 200 pour ne pas déclencher une boucle de retries
  }

  // ── Idempotence ──
  if (ref) {
    const existing = await db.query(
      "SELECT id FROM payments WHERE provider_tx_id = $1 AND status = 'success'", [ref],
    );
    if (existing.rowCount! > 0) return NextResponse.json({ already_processed: true });
  }

  // ── Vérification du montant (anti injection de prix) ──
  const booking = await db.query('SELECT total_price, status FROM bookings WHERE id = $1', [bookingId]);
  if (booking.rowCount === 0) return NextResponse.json({ ok: true });

  const expected = Number(booking.rows[0].total_price);
  const received = Number(params.amount);
  if (received && Math.abs(received - expected) > 1) {
    await db.query("UPDATE bookings SET status = 'flagged_fraud' WHERE id = $1", [bookingId]);
    await db.query(
      "UPDATE payments SET status = 'failed', webhook_payload = $2 WHERE booking_id = $1",
      [bookingId, JSON.stringify(params)],
    );
    await sendWhatsApp(
      process.env.ADMIN_PHONE!,
      `🚨 FRAUDE\nBooking ${String(bookingId).slice(0, 8)}\nAttendu ${expected} / Reçu ${received} FCFA`,
    );
    return NextResponse.json({ ok: true });
  }

  // ── Statut : responsecode=0 succès, -1 échec ──
  const rawCode = params.responsecode ?? params.response_code ?? params.responseCode;
  const code = rawCode != null && rawCode !== ''
    ? Number(String(rawCode).replace(/[^0-9-]/g, '')) : null;
  const isSuccess = code !== null && !Number.isNaN(code)
    ? code === 0
    : ['success', 'paid'].includes(String(params.status ?? '').toLowerCase()) || params.success === true;

  if (!isSuccess) {
    await db.query(
      "UPDATE payments SET status = 'failed', webhook_payload = $2 WHERE booking_id = $1",
      [bookingId, JSON.stringify(params)],
    );
    return NextResponse.json({ ok: true });
  }

  // ── Confirmation (uniquement si encore 'pending') ──
  if (booking.rows[0].status === 'pending') {
    await db.query('BEGIN');
    try {
      await db.query(
        "UPDATE bookings SET status = 'paid', paid_at = NOW() WHERE id = $1 AND status = 'pending'",
        [bookingId],
      );
      await db.query(
        `UPDATE payments
         SET status = 'success', provider_tx_id = COALESCE($2, provider_tx_id),
             webhook_payload = $3, webhook_received_at = NOW()
         WHERE booking_id = $1`,
        [bookingId, ref, JSON.stringify(params)],
      );
      await db.query(
        `INSERT INTO availability_blocks (listing_id, start_date, end_date, reason, booking_id)
         SELECT listing_id, check_in, check_out, 'booking', id FROM bookings WHERE id = $1`,
        [bookingId],
      );
      // Token consommé APRÈS succès de la transaction
      if (token) {
        await db.query('UPDATE payment_callback_tokens SET used = TRUE WHERE token = $1', [token]);
      }
      await db.query('COMMIT');
    } catch (e: unknown) {
      await db.query('ROLLBACK');
      // 23P01 = exclusion_violation (dates déjà bloquées) = double-paiement possible
      const pgCode = (e as { code?: string }).code;
      if (pgCode === '23P01' || pgCode === '23505') {
        await db.query("UPDATE bookings SET status = 'flagged_fraud' WHERE id = $1", [bookingId]);
        await sendWhatsApp(
          process.env.ADMIN_PHONE!,
          `⚠️ Conflit de dates (double paiement ?) booking ${String(bookingId).slice(0, 8)} — remboursement manuel à vérifier`,
        );
        return NextResponse.json({ ok: true });
      }
      console.error(`[WEBHOOK] Echec confirmation booking=${bookingId}`, e);
      return NextResponse.json({ ok: false }, { status: 500 }); // laisser PaiementPro réessayer
    }

    // Notifications WhatsApp (hors transaction)
    const fb = (await db.query(
      `SELECT b.check_in, b.check_out, b.total_price,
              uc.phone AS client_phone, uc.whatsapp_number AS client_wa,
              up.whatsapp_number AS owner_wa, l.title AS listing_title
       FROM bookings b
       JOIN listings l ON l.id = b.listing_id
       JOIN users uc ON uc.id = b.client_id
       JOIN users up ON up.id = l.owner_id
       WHERE b.id = $1`,
      [bookingId],
    )).rows[0];

    if (fb) {
      await sendWhatsApp(
        fb.client_wa ?? fb.client_phone,
        `✅ Réservation confirmée !\n${fb.listing_title}\nDu ${fb.check_in} au ${fb.check_out}\n` +
        `Montant payé : ${Number(fb.total_price).toLocaleString()} FCFA`,
      );
      if (fb.owner_wa) {
        await sendWhatsApp(
          fb.owner_wa,
          `🏠 Nouvelle réservation confirmée !\n${fb.listing_title}\nDu ${fb.check_in} au ${fb.check_out}\n` +
          `Montant en séquestre : ${Number(fb.total_price).toLocaleString()} FCFA`,
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export const GET  = handle;
export const POST = handle;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.PAYMENT_PRO_CALLBACK_ORIGIN ?? 'https://paiementpro.net',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-PaiementPro-Signature',
    },
  });
}
