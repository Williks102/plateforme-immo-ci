import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Route déclenchée par un cron externe (Render Cron Job ou UptimeRobot)
// Protégée par CRON_SECRET pour éviter les appels non autorisés
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const alerts: string[] = [];

  try {
    // Alerte 1 : fraudes multiples en 24h
    const fraud = await db.query(
      `SELECT COUNT(*) FROM bookings
       WHERE status = 'flagged_fraud' AND updated_at > NOW() - INTERVAL '24 hours'`
    );
    if (Number(fraud.rows[0].count) >= 3) {
      alerts.push(`🚨 ${fraud.rows[0].count} réservations flagged_fraud en 24h`);
    }

    // Alerte 2 : versement anormalement élevé (> 500 000 FCFA dans la dernière heure)
    const highDisbursement = await db.query(
      `SELECT id, montant_proprietaire FROM bookings
       WHERE disbursed_at > NOW() - INTERVAL '1 hour'
         AND montant_proprietaire > 500000`
    );
    if ((highDisbursement.rowCount ?? 0) > 0) {
      alerts.push(`⚠️ Versement élevé : ${highDisbursement.rows[0].montant_proprietaire} FCFA`);
    }

    // Alerte 3 : inscriptions suspectes (≥5 comptes depuis la même IP en 1h)
    const suspicious = await db.query(
      `SELECT ip_address, COUNT(*) as cnt
       FROM audit_logs
       WHERE action = 'user.signup' AND created_at > NOW() - INTERVAL '1 hour'
       GROUP BY ip_address HAVING COUNT(*) >= 5`
    );
    if ((suspicious.rowCount ?? 0) > 0) {
      alerts.push(`🔍 Inscriptions suspectes depuis ${suspicious.rows[0].ip_address}`);
    }

    // Envoyer via WhatsApp si alertes
    if (alerts.length > 0 && process.env.WHATSAPP_API_TOKEN) {
      const { sendWhatsApp } = await import('@/lib/whatsapp');
      await sendWhatsApp(
        process.env.ADMIN_PHONE!,
        `ALERTE IMMOCI\n${alerts.join('\n')}`
      );
    }

    return NextResponse.json({ ok: true, alerts });
  } catch (err) {
    console.error('[monitor]', err);
    return NextResponse.json({ error: 'Erreur monitoring' }, { status: 500 });
  }
}
