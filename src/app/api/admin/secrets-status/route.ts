import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

const ROTATION_THRESHOLD_DAYS = 90;

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const result = await db.query(
    `SELECT secret_name, last_rotated, notes,
            EXTRACT(EPOCH FROM (NOW() - last_rotated)) / 86400 AS days_since_rotation
     FROM secret_rotations
     ORDER BY last_rotated ASC`
  );

  const secrets = result.rows.map(r => ({
    name:             r.secret_name,
    lastRotated:      r.last_rotated,
    daysSince:        Math.floor(Number(r.days_since_rotation)),
    needsRotation:    Number(r.days_since_rotation) >= ROTATION_THRESHOLD_DAYS,
    notes:            r.notes,
  }));

  return NextResponse.json({
    secrets,
    threshold: ROTATION_THRESHOLD_DAYS,
    urgent: secrets.filter(s => s.needsRotation).length,
  });
}

// Enregistrer une rotation manuelle
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { secret_name, notes } = await req.json();
    if (!secret_name) return NextResponse.json({ error: 'secret_name requis' }, { status: 400 });

    await db.query(
      `UPDATE secret_rotations
       SET last_rotated = NOW(), rotated_by = $1, notes = $2
       WHERE secret_name = $3`,
      [session.userId, notes ?? null, secret_name]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[secrets-status]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
