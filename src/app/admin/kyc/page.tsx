'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface KycUser {
  id: string;
  email: string;
  kyc_status: string;
  kyc_document_url: string;
  created_at: string;
}

export default function AdminKycPage() {
  const [users, setUsers]   = useState<KycUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/admin/kyc');
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (userId: string, action: 'approve' | 'reject', reason?: string) => {
    setBusy(userId);
    try {
      const res = await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action, reason }),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error ?? 'Erreur');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Vérification KYC</h1>

        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-500">Aucun KYC en attente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{u.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Soumis le {new Date(u.created_at).toLocaleDateString('fr-CI')}
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      {u.kyc_status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => decide(u.id, 'approve')}
                      disabled={busy === u.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Raison du rejet (optionnel) :');
                        decide(u.id, 'reject', reason ?? undefined);
                      }}
                      disabled={busy === u.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
                {u.kyc_document_url && (
                  <div className="mt-4">
                    <a
                      href={u.kyc_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      Voir le document →
                    </a>
                    {/* Aperçu image si URL image */}
                    {/\.(jpg|jpeg|png|webp)$/i.test(u.kyc_document_url) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.kyc_document_url}
                        alt="Document KYC"
                        className="mt-3 max-w-sm rounded-xl border"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
