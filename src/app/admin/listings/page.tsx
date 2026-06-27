'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Listing {
  id: string;
  title: string;
  commune: string;
  quartier: string;
  prix_nuitee: number;
  photos: string[];
  created_at: string;
  owner_name: string;
  owner_email: string;
  kyc_status: string;
  status: string;
}

type Tab = 'pending_review' | 'published' | 'rejected';

export default function AdminListingsPage() {
  const [tab, setTab]         = useState<Tab>('pending_review');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);

  const load = async (status: Tab) => {
    setLoading(true);
    const res  = await fetch(`/api/admin/listings?status=${status}`);
    const data = await res.json();
    setListings(data.listings ?? []);
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  const approve = async (id: string) => {
    setBusy(id);
    const res = await fetch(`/api/admin/listings/${id}/approve`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setListings(prev => prev.filter(l => l.id !== id));
    } else {
      alert(data.error ?? 'Erreur');
    }
    setBusy(null);
  };

  const reject = async (id: string) => {
    const reason = prompt('Motif du refus (min 10 caractères) :');
    if (!reason || reason.length < 10) return;
    setBusy(id);
    const res = await fetch(`/api/admin/listings/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (res.ok) {
      setListings(prev => prev.filter(l => l.id !== id));
    } else {
      alert(data.error ?? 'Erreur');
    }
    setBusy(null);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'pending_review', label: 'En attente' },
    { key: 'published',      label: 'Publiés'    },
    { key: 'rejected',       label: 'Rejetés'    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestion des biens</h1>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>Aucun bien dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map(l => (
            <div key={l.id} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow">
              {l.photos?.[0] ? (
                <div className="relative w-28 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                  <Image src={l.photos[0]} alt="" fill className="object-cover" />
                </div>
              ) : (
                <div className="w-28 h-24 flex-shrink-0 rounded-xl bg-gray-100 flex items-center justify-center text-2xl text-gray-300">
                  🏠
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{l.title}</h2>
                    <p className="text-sm text-gray-500">{l.quartier ? `${l.quartier}, ` : ''}{l.commune}</p>
                    <p className="text-sm font-medium text-orange-600 mt-0.5">
                      {Number(l.prix_nuitee).toLocaleString('fr-CI')} FCFA/nuit
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Par : {l.owner_name || l.owner_email}
                      {l.kyc_status !== 'verified' && (
                        <span className="ml-2 text-orange-500">(KYC non vérifié)</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {new Date(l.created_at).toLocaleDateString('fr-CI')}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Link
                    href={`/admin/listings/${l.id}`}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                  >
                    Voir détail →
                  </Link>
                  {tab === 'pending_review' && (
                    <>
                      <button
                        onClick={() => approve(l.id)}
                        disabled={busy === l.id || l.kyc_status !== 'verified'}
                        title={l.kyc_status !== 'verified' ? 'KYC requis' : ''}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-green-700"
                      >
                        {busy === l.id ? '...' : '✓ Valider'}
                      </button>
                      <button
                        onClick={() => reject(l.id)}
                        disabled={busy === l.id}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-red-700"
                      >
                        {busy === l.id ? '...' : '✗ Rejeter'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
