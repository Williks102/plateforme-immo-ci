'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface ListingDetail {
  id: string;
  title: string;
  description: string;
  type_bien: string;
  commune: string;
  quartier: string;
  prix_nuitee: number;
  nb_chambres: number;
  nb_salles_bain: number;
  capacite_personnes: number;
  photos: string[];
  status: string;
  rejection_reason: string | null;
  is_verified: boolean;
  has_wifi: boolean;
  has_generator: boolean;
  has_split_ac: boolean;
  has_pool: boolean;
  created_at: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  kyc_status: string;
}

export default function AdminListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch(`/api/admin/listings/${id}`)
      .then(r => r.json())
      .then(d => { setListing(d.listing); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const approve = async () => {
    setBusy(true); setError('');
    const res = await fetch(`/api/admin/listings/${id}/approve`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setBusy(false); return; }
    router.push('/admin/listings');
  };

  const reject = async () => {
    const reason = prompt('Motif du refus (min 10 caractères) :');
    if (!reason || reason.length < 10) return;
    setBusy(true); setError('');
    const res = await fetch(`/api/admin/listings/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setBusy(false); return; }
    router.push('/admin/listings');
  };

  const verify = async () => {
    setBusy(true); setError('');
    const res = await fetch(`/api/admin/listings/${id}/verify`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setBusy(false); return; }
    setListing(prev => prev ? { ...prev, is_verified: true } : prev);
    setBusy(false);
  };

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>;
  if (!listing) return (
    <div className="p-8 text-center">
      <p className="text-gray-500 mb-4">Bien introuvable.</p>
      <Link href="/admin/listings" className="text-orange-600 hover:underline">← Retour aux biens</Link>
    </div>
  );

  const STATUS_LABELS: Record<string, string> = {
    pending_review: 'En attente',
    published:      'Publié',
    rejected:       'Rejeté',
    draft:          'Brouillon',
  };
  const STATUS_COLORS: Record<string, string> = {
    pending_review: 'bg-yellow-100 text-yellow-800',
    published:      'bg-green-100 text-green-800',
    rejected:       'bg-red-100 text-red-800',
    draft:          'bg-gray-100 text-gray-600',
  };

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/listings" className="text-gray-500 hover:text-gray-700 text-sm">← Biens</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900 truncate">{listing.title}</h1>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[listing.status] ?? 'bg-gray-100'}`}>
          {STATUS_LABELS[listing.status] ?? listing.status}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche — détails */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photos */}
          {listing.photos?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="relative h-64">
                <Image src={listing.photos[0]} alt={listing.title} fill className="object-cover" />
              </div>
              {listing.photos.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {listing.photos.slice(1).map((p, i) => (
                    <div key={i} className="relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image src={p} alt="" fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Infos principales */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Informations</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Type</span><p className="font-medium">{listing.type_bien}</p></div>
              <div><span className="text-gray-500">Prix/nuit</span><p className="font-medium">{Number(listing.prix_nuitee).toLocaleString('fr-CI')} FCFA</p></div>
              <div><span className="text-gray-500">Commune</span><p className="font-medium">{listing.commune}</p></div>
              <div><span className="text-gray-500">Quartier</span><p className="font-medium">{listing.quartier || '—'}</p></div>
              <div><span className="text-gray-500">Chambres</span><p className="font-medium">{listing.nb_chambres}</p></div>
              <div><span className="text-gray-500">Capacité</span><p className="font-medium">{listing.capacite_personnes} pers.</p></div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {listing.has_wifi      && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">📶 WiFi</span>}
              {listing.has_generator && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">⚡ Groupe élec.</span>}
              {listing.has_split_ac  && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">❄️ Clim</span>}
              {listing.has_pool      && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">🏊 Piscine</span>}
              {listing.is_verified   && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs">✅ Vérifié</span>}
            </div>

            {listing.description && (
              <div className="mt-4">
                <p className="text-gray-500 text-xs mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {listing.rejection_reason && (
              <div className="mt-4 p-3 bg-red-50 rounded-xl">
                <p className="text-xs text-red-500 font-medium mb-1">Motif de refus précédent</p>
                <p className="text-sm text-red-700">{listing.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite — propriétaire + actions */}
        <div className="space-y-6">
          {/* Propriétaire */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Propriétaire</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Nom : </span>{listing.owner_name || '—'}</p>
              <p><span className="text-gray-500">Email : </span>{listing.owner_email}</p>
              <p><span className="text-gray-500">Tél : </span>{listing.owner_phone || '—'}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-500">KYC : </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  listing.kyc_status === 'verified'     ? 'bg-green-100 text-green-700'  :
                  listing.kyc_status === 'id_submitted' ? 'bg-yellow-100 text-yellow-700' :
                  listing.kyc_status === 'rejected'     ? 'bg-red-100 text-red-700'      :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {listing.kyc_status}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 mb-2">Actions</h2>

            {listing.status === 'pending_review' && (
              <>
                <button
                  onClick={approve}
                  disabled={busy || listing.kyc_status !== 'verified'}
                  className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-green-700"
                >
                  ✓ Valider et publier
                </button>
                {listing.kyc_status !== 'verified' && (
                  <p className="text-xs text-orange-600">KYC propriétaire non vérifié — validation bloquée</p>
                )}
                <button
                  onClick={reject}
                  disabled={busy}
                  className="w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-red-700"
                >
                  ✗ Refuser
                </button>
              </>
            )}

            {listing.status === 'published' && !listing.is_verified && (
              <button
                onClick={verify}
                disabled={busy}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700"
              >
                ✅ Marquer comme vérifié
              </button>
            )}

            {listing.status === 'published' && listing.is_verified && (
              <div className="p-3 bg-green-50 rounded-xl text-center text-sm text-green-700 font-medium">
                ✅ Bien publié et vérifié
              </div>
            )}

            <p className="text-xs text-gray-400">
              Soumis le {new Date(listing.created_at).toLocaleDateString('fr-CI')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
