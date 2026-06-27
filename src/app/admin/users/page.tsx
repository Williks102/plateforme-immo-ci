'use client';
import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  kyc_status: string;
  is_banned: boolean;
  created_at: string;
  listing_count: number;
  booking_count: number;
}

const ROLE_COLORS: Record<string, string> = {
  admin:        'bg-purple-100 text-purple-700',
  proprietaire: 'bg-blue-100 text-blue-700',
  client:       'bg-gray-100 text-gray-600',
};

const KYC_COLORS: Record<string, string> = {
  verified:     'bg-green-100 text-green-700',
  id_submitted: 'bg-yellow-100 text-yellow-700',
  rejected:     'bg-red-100 text-red-700',
  unverified:   'bg-gray-100 text-gray-500',
};

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<User[]>([]);
  const [total, setTotal]     = useState(0);
  const [search, setSearch]   = useState('');
  const [role, setRole]       = useState('');
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit: '50' });
      if (search) p.set('search', search);
      if (role)   p.set('role', role);
      const res  = await fetch(`/api/admin/users?${p}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => { load(); }, [load]);

  const toggleBan = async (userId: string, currentBan: boolean) => {
    setBusy(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ban: !currentBan }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, is_banned: !currentBan } : u
        ));
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Utilisateurs ({total})</h1>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rechercher</label>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Email ou nom..."
            className="px-3 py-2 border rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-orange-500"
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(); } }}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rôle</label>
          <select
            value={role} onChange={e => { setRole(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Tous</option>
            <option value="client">Client</option>
            <option value="proprietaire">Propriétaire</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={() => { setPage(1); load(); }}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium"
        >
          Filtrer
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-center py-12 text-gray-400">Chargement...</p>
        ) : users.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Aucun utilisateur trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Rôle</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">KYC</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Activité</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Inscription</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Statut</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 ${u.is_banned ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.full_name || '—'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${KYC_COLORS[u.kyc_status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {u.kyc_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.role === 'proprietaire' && <p>{u.listing_count} bien{Number(u.listing_count) !== 1 ? 's' : ''}</p>}
                      {u.role === 'client' && <p>{u.booking_count} rés.</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('fr-CI')}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_banned ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Banni</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Actif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleBan(u.id, u.is_banned)}
                        disabled={busy === u.id || u.role === 'admin'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors ${
                          u.is_banned
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        title={u.role === 'admin' ? 'Impossible de bannir un admin' : ''}
                      >
                        {busy === u.id ? '...' : u.is_banned ? 'Débannir' : 'Bannir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex gap-3 mt-4 justify-center items-center">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
        >
          Précédent
        </button>
        <span className="text-sm text-gray-500">
          Page {page} · {total} utilisateur{total !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={users.length < 50}
          className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
