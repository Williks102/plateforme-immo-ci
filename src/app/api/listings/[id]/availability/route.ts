import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/listings/[id]/availability — dates bloquées pour le calendrier
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db.query(
      `SELECT start_date, end_date
       FROM availability_blocks
       WHERE listing_id = $1
         AND end_date >= CURRENT_DATE
       ORDER BY start_date`,
      [id]
    );

    // Générer la liste de toutes les dates bloquées
    const blockedDates: string[] = [];
    for (const row of result.rows) {
      const start = new Date(row.start_date);
      const end   = new Date(row.end_date);
      const cur   = new Date(start);
      while (cur < end) {
        blockedDates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    }

    return NextResponse.json({ blockedDates });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
