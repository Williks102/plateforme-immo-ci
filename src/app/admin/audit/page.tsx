'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AuditLog {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  actor_email: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [loading, setLoading]     = useState(false);
  const [actionFilter, setAction] = useState('');
  const [page, setPage]           = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit: '50' });
      if (actionFilter) p.set('action', actionFilter);
      const res = await fetch(`/api/admin/audit?${p}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const ACTION_COLORS: Record<string, string> = {
    'user.ban':    'bg-red-100 text-red-700',
    'user.unban':  'bg-green-100 text-green-700',
    'kyc.approve': 'bg-green-100 text-green-700',
    'kyc.reject':  'bg-yellow-100 text-yellow-700',
    'listing.approve': 'bg-green-100 text-green-700',
    'listing.reject':  'bg-red-100 text-red-700',
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">← Admin</Link>
          <h1 className="text-2xl font-bold text-gray-900">Journal d'audit</h1>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filtrer par action</label>
            <input
              type="text" value={actionFilter} onChange={e => setAction(e.target.value)}
              placeholder="ex: kyc.approve, user.ban"
              className="px-3 py-2 border rounded-lg text-sm w-56"
            />
          </div>
          <button
            onClick={() => { setPage(1); load(); }}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm"
          >
            Filtrer
          </button>
          {actionFilter && (
            <button onClick={() => setAction('')} className="text-sm text-gray-500 underline">
              Effacer
            </button>
          )}
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <p className="text-center py-12 text-gray-400">Chargement...</p>
          ) : logs.length === 0 ? (
            <p className="text-center py-12 text-gray-400">Aucun log trouvé.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Horodatage</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Acteur</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Cible</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('fr-CI')}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{log.actor_email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {log.target_type && <span className="font-medium">{log.target_type}: </span>}
                      {log.target_id?.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.ip_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex gap-3 mt-4 justify-center">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < 50}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      </div>
    </main>
  );
}
