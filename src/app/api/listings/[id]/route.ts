import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitize';

// GET /api/listings/[id] — détail d'un bien publié
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db.query(
      `SELECT l.*, u.full_name as owner_name, u.whatsapp_number as owner_whatsapp
       FROM listings l
       JOIN users u ON u.id = l.owner_id
       WHERE l.id = $1 AND l.status = 'published'`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 });
    }

    // Avis du bien
    const reviews = await db.query(
      `SELECT r.rating, r.comment, r.created_at,
              SUBSTRING(u.full_name, 1, 1) || '. ' || SPLIT_PART(u.full_name, ' ', 2) as reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.listing_id = $1 AND r.is_visible = TRUE
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [id]
    );

    return NextResponse.json({ listing: result.rows[0], reviews: reviews.rows });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

// PATCH /api/listings/[id] — modifier son propre bien
const updateSchema = z.object({
  title:            z.string().min(5).max(200).optional(),
  description:      z.string().max(2000).optional(),
  prix_nuitee:      z.number().positive().max(10_000_000).optional(),
  nb_chambres:      z.number().int().min(1).max(50).optional(),
  nb_salles_bain:   z.number().int().min(1).max(20).optional(),
  has_generator:    z.boolean().optional(),
  has_water_pump:   z.boolean().optional(),
  has_split_ac:     z.boolean().optional(),
  has_wifi:         z.boolean().optional(),
  has_parking:      z.boolean().optional(),
  has_pool:         z.boolean().optional(),
  photos:           z.array(z.string().url()).max(20).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.title !== undefined) {
      fields.push(`title = $${i++}`);
      values.push(sanitizeText(body.title));
    }
    if (body.description !== undefined) {
      fields.push(`description = $${i++}`);
      values.push(sanitizeText(body.description));
    }
    if (body.prix_nuitee !== undefined) { fields.push(`prix_nuitee = $${i++}`); values.push(body.prix_nuitee); }
    if (body.nb_chambres !== undefined) { fields.push(`nb_chambres = $${i++}`); values.push(body.nb_chambres); }
    if (body.nb_salles_bain !== undefined) { fields.push(`nb_salles_bain = $${i++}`); values.push(body.nb_salles_bain); }
    if (body.has_generator !== undefined) { fields.push(`has_generator = $${i++}`); values.push(body.has_generator); }
    if (body.has_water_pump !== undefined) { fields.push(`has_water_pump = $${i++}`); values.push(body.has_water_pump); }
    if (body.has_split_ac !== undefined) { fields.push(`has_split_ac = $${i++}`); values.push(body.has_split_ac); }
    if (body.has_wifi !== undefined) { fields.push(`has_wifi = $${i++}`); values.push(body.has_wifi); }
    if (body.has_parking !== undefined) { fields.push(`has_parking = $${i++}`); values.push(body.has_parking); }
    if (body.has_pool !== undefined) { fields.push(`has_pool = $${i++}`); values.push(body.has_pool); }
    if (body.photos !== undefined) { fields.push(`photos = $${i++}`); values.push(body.photos); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    fields.push(`updated_at = NOW()`);
    // WHERE id=$N AND owner_id=$N+1 — garde-fou IDOR
    values.push(id, session.userId);

    const result = await db.query(
      `UPDATE listings SET ${fields.join(', ')}
       WHERE id = $${i++} AND owner_id = $${i}
       RETURNING id`,
      values
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error('[PATCH /api/listings/[id]]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
