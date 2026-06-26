import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitize';

// GET /api/listings — liste des biens publiés avec filtres
const searchSchema = z.object({
  commune:         z.string().max(100).optional(),
  prix_min:        z.coerce.number().min(0).max(10_000_000).optional(),
  prix_max:        z.coerce.number().min(0).max(10_000_000).optional(),
  nb_chambres:     z.coerce.number().int().min(1).max(20).optional(),
  has_generator:   z.coerce.boolean().optional(),
  has_water_pump:  z.coerce.boolean().optional(),
  has_split_ac:    z.coerce.boolean().optional(),
  has_wifi:        z.coerce.boolean().optional(),
  is_verified:     z.coerce.boolean().optional(),
  lat:             z.coerce.number().min(-90).max(90).optional(),
  lng:             z.coerce.number().min(-180).max(180).optional(),
  radius_km:       z.coerce.number().min(0.1).max(50).default(5),
  page:            z.coerce.number().int().min(1).default(1),
  limit:           z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
    const params = searchSchema.parse(sp);
    const offset = (params.page - 1) * params.limit;

    const result = await db.query(
      `SELECT id, title, prix_nuitee, quartier, commune, avg_rating, review_count,
              photos[1] as cover_photo, is_verified, lat, lng
       FROM v_published_listings
       WHERE ($1::text IS NULL OR commune = $1)
         AND ($2::numeric IS NULL OR prix_nuitee >= $2)
         AND ($3::numeric IS NULL OR prix_nuitee <= $3)
         AND ($4::int IS NULL OR nb_chambres >= $4)
         AND ($5::boolean IS NULL OR has_generator = $5)
         AND ($6::boolean IS NULL OR has_water_pump = $6)
         AND ($7::boolean IS NULL OR has_split_ac = $7)
         AND ($8::boolean IS NULL OR has_wifi = $8)
         AND ($9::boolean IS NULL OR is_verified = $9)
         AND ($10::float IS NULL OR ST_DWithin(
               location::geography,
               ST_MakePoint($11, $10)::geography,
               $12 * 1000
             ))
       ORDER BY is_verified DESC, avg_rating DESC
       LIMIT $13 OFFSET $14`,
      [
        params.commune ?? null,
        params.prix_min ?? null,
        params.prix_max ?? null,
        params.nb_chambres ?? null,
        params.has_generator ?? null,
        params.has_water_pump ?? null,
        params.has_split_ac ?? null,
        params.has_wifi ?? null,
        params.is_verified ?? null,
        params.lat ?? null,
        params.lng ?? null,
        params.radius_km,
        params.limit,
        offset,
      ]
    );

    return NextResponse.json({ listings: result.rows });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error('[GET /api/listings]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

// POST /api/listings — créer un bien (propriétaire authentifié)
const createSchema = z.object({
  title:            z.string().min(5).max(200),
  description:      z.string().max(2000).optional(),
  commune:          z.string().max(100),
  quartier:         z.string().max(100).optional(),
  adresse_indicative: z.string().max(500).optional(),
  prix_nuitee:      z.number().positive().max(10_000_000),
  nb_chambres:      z.number().int().min(1).max(50).default(1),
  nb_salles_bain:   z.number().int().min(1).max(20).default(1),
  has_generator:    z.boolean().default(false),
  has_water_pump:   z.boolean().default(false),
  has_split_ac:     z.boolean().default(false),
  has_wifi:         z.boolean().default(false),
  has_parking:      z.boolean().default(false),
  has_pool:         z.boolean().default(false),
  latitude:         z.number().min(-90).max(90).optional(),
  longitude:        z.number().min(-180).max(180).optional(),
  photos:           z.array(z.string().url()).max(20).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (session.role === 'client') {
      // Mettre à jour le rôle en propriétaire
      await db.query('UPDATE users SET role = $1 WHERE id = $2', ['proprietaire', session.userId]);
    }

    const body = createSchema.parse(await req.json());

    const sanitizedTitle = sanitizeText(body.title);
    const sanitizedDescription = body.description ? sanitizeText(body.description) : null;

    const location = body.latitude && body.longitude
      ? `ST_SetSRID(ST_MakePoint(${body.longitude}, ${body.latitude}), 4326)`
      : 'NULL';

    const result = await db.query(
      `INSERT INTO listings
         (owner_id, title, description, commune, quartier, adresse_indicative,
          prix_nuitee, nb_chambres, nb_salles_bain,
          has_generator, has_water_pump, has_split_ac, has_wifi, has_parking, has_pool,
          location, photos, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
               ${location},$16,'pending_review')
       RETURNING id`,
      [
        session.userId, sanitizedTitle, sanitizedDescription, body.commune, body.quartier,
        body.adresse_indicative, body.prix_nuitee, body.nb_chambres, body.nb_salles_bain,
        body.has_generator, body.has_water_pump, body.has_split_ac,
        body.has_wifi, body.has_parking, body.has_pool, body.photos,
      ]
    );

    const listingId = result.rows[0].id;

    // Notifier l'admin
    const { notifyAdmin } = await import('@/lib/whatsapp');
    await notifyAdmin({
      message: `Nouveau bien à valider : ${sanitizedTitle} — ${body.commune}`,
      listing_url: `${process.env.NEXTAUTH_URL}/admin/listings/${listingId}`,
    });

    return NextResponse.json({ id: listingId }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error('[POST /api/listings]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
