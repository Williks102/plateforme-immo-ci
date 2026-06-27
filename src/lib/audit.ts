import { db } from '@/lib/db';

export async function logAudit(params: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6::inet)`,
      [
        params.actorId,
        params.action,
        params.targetType ?? null,
        params.targetId ?? null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        params.ipAddress ?? null,
      ]
    );
  } catch (e) {
    console.error('[audit] log failed:', e);
  }
}
