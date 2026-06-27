import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const searchSchema = z.object({
  commune:        z.string().max(100).optional(),
  prix_min:       z.coerce.number().min(0).max(10_000_000).optional(),
  prix_max:       z.coerce.number().min(0).max(10_000_000).optional(),
  nb_chambres:    z.coerce.number().int().min(1).max(20).optional(),
  lat:            z.coerce.number().min(-90).max(90).optional(),
  lng:            z.coerce.number().min(-180).max(180).optional(),
  radius_km:      z.coerce.number().min(0.1).max(50).default(5),
  has_generator:  z.coerce.boolean().optional(),
  has_water_pump: z.coerce.boolean().optional(),
  has_split_ac:   z.coerce.boolean().optional(),
  has_wifi:       z.coerce.boolean().optional(),
  is_verified:    z.coerce.boolean().optional(),
  page:           z.coerce.number().int().min(1).default(1),
  limit:          z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const q = searchSchema.parse(params);

    const offset = (q.page - 1) * q.limit;
    const hasGeo = q.lat !== undefined && q.lng !== undefined;

    const result = await db.query(
      `SELECT id, title, prix_nuitee, quartier, commune, avg_rating, review_count,
              photos[1] as cover_photo, is_verified,
              nb_chambres, has_generator, has_wifi, has_split_ac, has_pool,
              ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat
       FROM listings
       WHERE status = 'published'
         AND ($1::text IS NULL OR commune = $1)
         AND ($2::numeric IS NULL OR prix_nuitee >= $2)
         AND ($3::numeric IS NULL OR prix_nuitee <= $3)
         AND ($4::int IS NULL OR nb_chambres >= $4)
         AND ($5::boolean IS NULL OR has_generator = $5)
         AND ($6::boolean IS NULL OR has_water_pump = $6)
         AND ($7::boolean IS NULL OR has_split_ac = $7)
         AND ($8::boolean IS NULL OR has_wifi = $8)
         AND ($9::boolean IS NULL OR is_verified = $9)
         AND (NOT $10::boolean OR (location IS NOT NULL AND ST_DWithin(
               location::geography,
               ST_MakePoint($12, $11)::geography,
               $13 * 1000
             )))
       ORDER BY is_verified DESC, avg_rating DESC
       LIMIT $14 OFFSET $15`,
      [
        q.commune ?? null,
        q.prix_min ?? null,
        q.prix_max ?? null,
        q.nb_chambres ?? null,
        q.has_generator ?? null,
        q.has_water_pump ?? null,
        q.has_split_ac ?? null,
        q.has_wifi ?? null,
        q.is_verified ?? null,
        hasGeo,          // $10 : activer filtre géo
        q.lat ?? 0,      // $11
        q.lng ?? 0,      // $12
        q.radius_km,     // $13
        q.limit,         // $14
        offset,          // $15
      ]
    );

    return NextResponse.json({
      listings: result.rows,
      page:     q.page,
      limit:    q.limit,
      count:    result.rowCount,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('[search]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
