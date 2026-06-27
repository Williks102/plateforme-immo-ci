import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { differenceInDays } from 'date-fns';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { buildWebhookNotificationUrl } from '@/lib/paiementpro';
import { initiatePaiementPro } from '@/lib/paiementpro';

// Schéma strict — uniquement listing_id + dates acceptés du client
// ❌ total_price, prix_nuitee, remises → JAMAIS acceptés depuis le client
const bookingSchema = z.object({
  listing_id: z.string().uuid(),
  check_in:   z.string().date(),
  check_out:  z.string().date(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const userCheck = await db.query('SELECT is_banned FROM users WHERE id = $1', [session.userId]);
    if (userCheck.rows[0]?.is_banned) {
      return NextResponse.json({ error: 'Compte suspendu' }, { status: 403 });
    }

    const { listing_id, check_in, check_out } = bookingSchema.parse(await req.json());

    const checkInDate  = new Date(check_in);
    const checkOutDate = new Date(check_out);

    if (checkInDate >= checkOutDate) {
      return NextResponse.json({ error: 'Dates invalides' }, { status: 400 });
    }
    if (checkInDate < new Date()) {
      return NextResponse.json({ error: "La date d'arrivée ne peut pas être dans le passé" }, { status: 400 });
    }

    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [listing_id]);

    const availResult = await db.query(
      'SELECT check_availability($1, $2, $3) as ok',
      [listing_id, check_in, check_out]
    );
    if (!availResult.rows[0].ok) {
      await db.query('ROLLBACK');
      return NextResponse.json({ error: 'Ces dates ne sont plus disponibles' }, { status: 409 });
    }

    // Prix + remises calculés EXCLUSIVEMENT depuis la base de données
    const listing = await db.query(
      `SELECT prix_nuitee, remise_semaine_pct, remise_mois_pct, title
       FROM listings WHERE id = $1 AND status = 'published'`,
      [listing_id]
    );
    if (listing.rowCount === 0) {
      await db.query('ROLLBACK');
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 });
    }

    const prix_nuitee       = Number(listing.rows[0].prix_nuitee);
    const remise_semaine    = Number(listing.rows[0].remise_semaine_pct ?? 0);
    const remise_mois       = Number(listing.rows[0].remise_mois_pct    ?? 0);
    const nb_nuits          = differenceInDays(checkOutDate, checkInDate);

    // Calcul de la remise applicable
    let remise_appliquee_pct = 0;
    if (nb_nuits >= 30 && remise_mois > 0)    remise_appliquee_pct = remise_mois;
    else if (nb_nuits >= 7 && remise_semaine > 0) remise_appliquee_pct = remise_semaine;

    const prix_effectif         = remise_appliquee_pct > 0
      ? prix_nuitee * (1 - remise_appliquee_pct / 100)
      : prix_nuitee;
    const total_price           = Math.round(prix_effectif * nb_nuits);
    const commission            = Math.round(total_price * 0.08);
    const montant_proprietaire  = total_price - commission;

    const client = await db.query(
      'SELECT phone, full_name, email FROM users WHERE id = $1',
      [session.userId]
    );
    const clientRow = client.rows[0];
    const [firstName, ...lastParts] = (clientRow.full_name ?? 'Client').split(' ');

    const booking = await db.query(
      `INSERT INTO bookings
         (listing_id, client_id, check_in, check_out,
          prix_nuitee_snapshot, total_price, commission_platform, montant_proprietaire,
          remise_appliquee_pct, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
       RETURNING id`,
      [
        listing_id, session.userId, check_in, check_out,
        prix_nuitee, total_price, commission, montant_proprietaire,
        remise_appliquee_pct,
      ]
    );

    const bookingId = booking.rows[0].id;

    const callbackToken = crypto.randomUUID();
    await db.query(
      'INSERT INTO payment_callback_tokens (booking_id, token, expires_at) VALUES ($1, $2, $3)',
      [bookingId, callbackToken, new Date(Date.now() + 2 * 60 * 60 * 1000)]
    );

    const baseUrl = process.env.NEXTAUTH_URL!;
    const result = await initiatePaiementPro({
      amount:            total_price,
      bookingId,
      customerPhone:     clientRow.phone,
      customerEmail:     clientRow.email ?? `${session.userId}@placeholder.ci`,
      customerFirstName: firstName,
      customerLastname:  lastParts.join(' ') || 'Utilisateur',
      notificationURL:   buildWebhookNotificationUrl(baseUrl, callbackToken),
      returnURL:         `${baseUrl}/reservations/${bookingId}/confirmation`,
    });

    if (!result.success) {
      // ROLLBACK annule booking + payment_callback_tokens atomiquement
      // (ne pas faire DELETE manuellement — FK violation car le token existe déjà)
      await db.query('ROLLBACK');
      return NextResponse.json({ error: "Erreur d'initialisation du paiement" }, { status: 502 });
    }

    await db.query(
      'INSERT INTO payments (booking_id, provider, provider_tx_id, amount, status) VALUES ($1,$2,$3,$4,$5)',
      [bookingId, 'paiementpro', result.referenceNumber, total_price, 'initiated']
    );

    await db.query('COMMIT');

    return NextResponse.json({ paymentUrl: result.paymentUrl, bookingId }, { status: 201 });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('[POST /api/bookings]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

// GET /api/bookings — réservations de l'utilisateur connecté
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    let query: string;
    let values: string[];

    if (session.role === 'proprietaire' || session.role === 'admin') {
      query = `SELECT b.*, l.title as listing_title, l.commune
               FROM bookings b
               JOIN listings l ON l.id = b.listing_id
               WHERE l.owner_id = $1
               ORDER BY b.created_at DESC`;
      values = [session.userId];
    } else {
      query = `SELECT b.*, l.title as listing_title, l.commune
               FROM bookings b
               JOIN listings l ON l.id = b.listing_id
               WHERE b.client_id = $1
               ORDER BY b.created_at DESC`;
      values = [session.userId];
    }

    const result = await db.query(query, values);
    return NextResponse.json({ bookings: result.rows });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
