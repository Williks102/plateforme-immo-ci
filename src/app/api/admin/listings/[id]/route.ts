import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;

  const result = await db.query(
    `SELECT l.id, l.title, l.description, l.type_bien, l.commune, l.quartier,
            l.prix_nuitee, l.nb_chambres, l.nb_salles_bain, l.capacite_personnes,
            l.photos, l.status, l.rejection_reason, l.is_verified, l.created_at,
            l.has_wifi, l.has_generator, l.has_split_ac, l.has_pool,
            u.full_name as owner_name, u.email as owner_email,
            u.phone as owner_phone, u.kyc_status
     FROM listings l
     JOIN users u ON u.id = l.owner_id
     WHERE l.id = $1`,
    [id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 });
  }

  return NextResponse.json({ listing: result.rows[0] });
}
