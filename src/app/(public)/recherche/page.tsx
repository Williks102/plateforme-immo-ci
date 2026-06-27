'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const COMMUNES = [
  'Cocody','Plateau','Marcory','Treichville','Adjamé',
  'Yopougon','Koumassi','Port-Bouët','Abobo','Attécoubé','Bingerville','Songon',
];

interface Listing {
  id: string;
  title: string;
  prix_nuitee: number;
  commune: string;
  quartier: string;
  avg_rating: number;
  review_count: number;
  cover_photo: string | null;
  is_verified: boolean;
  lat: number | null;
  lng: number | null;
}

export default function RecherchePage() {
  const [commune, setCommune]       = useState('');
  const [prixMin, setPrixMin]       = useState('');
  const [prixMax, setPrixMax]       = useState('');
  const [chambres, setChambres]     = useState('');
  const [wifi, setWifi]             = useState(false);
  const [generator, setGenerator]   = useState(false);
  const [clim, setClim]             = useState(false);
  const [verifie, setVerifie]       = useState(false);
  const [results, setResults]       = useState<Listing[]>([]);
  const [loading, setLoading]       = useState(false);
  const [hoveredId, setHoveredId]   = useState<string | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (commune)   p.set('commune', commune);
      if (prixMin)   p.set('prix_min', prixMin);
      if (prixMax)   p.set('prix_max', prixMax);
      if (chambres)  p.set('nb_chambres', chambres);
      if (wifi)      p.set('has_wifi', 'true');
      if (generator) p.set('has_generator', 'true');
      if (clim)      p.set('has_split_ac', 'true');
      if (verifie)   p.set('is_verified', 'true');

      const res = await fetch(`/api/listings/search?${p}`);
      const data = await res.json();
      setResults(data.listings ?? []);
    } finally {
      setLoading(false);
    }
  }, [commune, prixMin, prixMax, chambres, wifi, generator, clim, verifie]);

  useEffect(() => { search(); }, [search]);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Filtres */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3 items-end">
            <Link href="/" className="text-lg font-bold text-orange-600 mr-2">ImmoCI</Link>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Commune</label>
              <select
                value={commune}
                onChange={e => setCommune(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Toutes</option>
                {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prix min (FCFA)</label>
              <input
                type="number" value={prixMin} onChange={e => setPrixMin(e.target.value)}
                placeholder="5 000" className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prix max (FCFA)</label>
              <input
                type="number" value={prixMax} onChange={e => setPrixMax(e.target.value)}
                placeholder="200 000" className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Chambres min</label>
              <input
                type="number" value={chambres} onChange={e => setChambres(e.target.value)}
                min="1" max="20" placeholder="1" className="w-20 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'WiFi', val: wifi, set: setWifi },
                { label: 'Groupe élec.', val: generator, set: setGenerator },
                { label: 'Clim', val: clim, set: setClim },
                { label: 'Vérifiés', val: verifie, set: setVerifie },
              ].map(f => (
                <label key={f.label} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input type="checkbox" checked={f.val} onChange={e => f.set(e.target.checked)} className="accent-orange-600" />
                  {f.label}
                </label>
              ))}
            </div>
            <button
              onClick={search}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-orange-700"
            >
              {loading ? 'Chargement...' : 'Rechercher'}
            </button>
          </div>
        </div>
      </div>

      {/* Résultats + carte */}
      <div className="max-w-6xl mx-auto flex gap-4 p-4" style={{ height: 'calc(100vh - 100px)' }}>
        {/* Liste */}
        <div className="w-80 flex-shrink-0 overflow-y-auto space-y-3 pr-1">
          <p className="text-sm text-gray-500">{results.length} résultat{results.length !== 1 ? 's' : ''}</p>
          {results.length === 0 && !loading && (
            <p className="text-gray-400 text-sm">Aucun bien trouvé avec ces filtres.</p>
          )}
          {results.map(l => (
            <Link
              key={l.id}
              href={`/listings/${l.id}`}
              onMouseEnter={() => setHoveredId(l.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`block bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${hoveredId === l.id ? 'ring-2 ring-orange-500' : ''}`}
            >
              {l.cover_photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.cover_photo} alt={l.title} className="w-full h-32 object-cover" />
              )}
              {!l.cover_photo && (
                <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300 text-3xl">🏠</div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm line-clamp-2">{l.title}</p>
                  {l.is_verified && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">✓ Vérifié</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{l.quartier ? `${l.quartier}, ` : ''}{l.commune}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold text-orange-600">{Number(l.prix_nuitee).toLocaleString('fr-CI')} FCFA/nuit</p>
                  {l.avg_rating > 0 && (
                    <span className="text-xs text-gray-500">★ {Number(l.avg_rating).toFixed(1)} ({l.review_count})</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Carte Mapbox */}
        <div className="flex-1 rounded-2xl overflow-hidden shadow-sm">
          <MapView listings={results} hoveredId={hoveredId} />
        </div>
      </div>
    </main>
  );
}
