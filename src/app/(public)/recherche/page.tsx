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

type View = 'list' | 'map';

export default function RecherchePage() {
  const [commune, setCommune]     = useState('');
  const [prixMin, setPrixMin]     = useState('');
  const [prixMax, setPrixMax]     = useState('');
  const [chambres, setChambres]   = useState('');
  const [wifi, setWifi]           = useState(false);
  const [generator, setGenerator] = useState(false);
  const [clim, setClim]           = useState(false);
  const [verifie, setVerifie]     = useState(false);
  const [results, setResults]     = useState<Listing[]>([]);
  const [loading, setLoading]     = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView]           = useState<View>('list');

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
      const res  = await fetch(`/api/listings/search?${p}`);
      const data = await res.json();
      setResults(data.listings ?? []);
    } finally {
      setLoading(false);
    }
  }, [commune, prixMin, prixMax, chambres, wifi, generator, clim, verifie]);

  useEffect(() => { search(); }, [search]);

  const activeFilters = [commune, prixMin, prixMax, chambres, wifi, generator, clim, verifie].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ─── Barre du haut ─── */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-lg font-bold text-orange-600 flex-shrink-0">ImmoCI</Link>

          {/* Bouton filtres — visible sur mobile */}
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M10 12h4" />
            </svg>
            Filtres
            {activeFilters > 0 && (
              <span className="bg-orange-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>
            )}
          </button>

          {/* Filtres desktop inline */}
          <div className="hidden md:flex flex-wrap gap-3 items-end flex-1">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Commune</label>
              <select
                value={commune}
                onChange={e => setCommune(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="">Toutes</option>
                {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prix min</label>
              <input
                type="number" value={prixMin} onChange={e => setPrixMin(e.target.value)}
                placeholder="5 000" className="w-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prix max</label>
              <input
                type="number" value={prixMax} onChange={e => setPrixMax(e.target.value)}
                placeholder="200 000" className="w-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Chambres min</label>
              <input
                type="number" value={chambres} onChange={e => setChambres(e.target.value)}
                min="1" max="20" placeholder="1" className="w-16 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'WiFi',          val: wifi,      set: setWifi },
                { label: 'Groupe élec.',  val: generator, set: setGenerator },
                { label: 'Clim',          val: clim,      set: setClim },
                { label: 'Vérifiés',      val: verifie,   set: setVerifie },
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
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-orange-700 transition-colors"
            >
              {loading ? '...' : 'Rechercher'}
            </button>
          </div>
        </div>

        {/* Filtres mobiles dépliables */}
        {filtersOpen && (
          <div className="md:hidden border-t bg-white px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Commune</label>
                <select
                  value={commune}
                  onChange={e => setCommune(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">Toutes</option>
                  {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Chambres min</label>
                <input
                  type="number" inputMode="numeric" value={chambres}
                  onChange={e => setChambres(e.target.value)}
                  min="1" max="20" placeholder="1"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prix min (FCFA)</label>
                <input
                  type="number" inputMode="numeric" value={prixMin}
                  onChange={e => setPrixMin(e.target.value)}
                  placeholder="5 000"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prix max (FCFA)</label>
                <input
                  type="number" inputMode="numeric" value={prixMax}
                  onChange={e => setPrixMax(e.target.value)}
                  placeholder="200 000"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '📶 WiFi',         val: wifi,      set: setWifi },
                { label: '⚡ Groupe élec.', val: generator, set: setGenerator },
                { label: '❄️ Clim',         val: clim,      set: setClim },
                { label: '✓ Vérifiés',      val: verifie,   set: setVerifie },
              ].map(f => (
                <label key={f.label} className="flex items-center gap-2 cursor-pointer text-sm bg-gray-50 rounded-lg px-3 py-2.5">
                  <input type="checkbox" checked={f.val} onChange={e => f.set(e.target.checked)} className="accent-orange-600 w-4 h-4" />
                  {f.label}
                </label>
              ))}
            </div>
            <button
              onClick={() => { search(); setFiltersOpen(false); }}
              disabled={loading}
              className="w-full py-3 bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Recherche...' : 'Appliquer les filtres'}
            </button>
          </div>
        )}
      </div>

      {/* ─── Corps ─── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Liste — masquée sur mobile si vue carte */}
        <div className={[
          'flex flex-col',
          'md:w-80 md:flex-shrink-0 md:border-r md:bg-white md:overflow-y-auto',
          view === 'map' ? 'hidden md:flex' : 'flex flex-1 md:flex-none bg-white overflow-y-auto',
        ].join(' ')}>
          <div className="px-4 py-3 border-b text-sm text-gray-500 flex items-center justify-between">
            <span>{results.length} résultat{results.length !== 1 ? 's' : ''}</span>
            {loading && <span className="text-orange-500 text-xs">Chargement...</span>}
          </div>

          {results.length === 0 && !loading && (
            <div className="px-4 py-10 text-center text-gray-400 text-sm">Aucun bien trouvé avec ces filtres.</div>
          )}

          <div className="p-3 space-y-3 flex-1">
            {results.map(l => (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                onMouseEnter={() => setHoveredId(l.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={[
                  'block bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow',
                  hoveredId === l.id ? 'ring-2 ring-orange-500' : '',
                ].join(' ')}
              >
                {l.cover_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.cover_photo} alt={l.title} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-300 text-3xl">🏠</div>
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm line-clamp-2 flex-1">{l.title}</p>
                    {l.is_verified && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">✓ Vérifié</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{l.quartier ? `${l.quartier}, ` : ''}{l.commune}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-bold text-orange-600">{Number(l.prix_nuitee).toLocaleString('fr-CI')} <span className="font-normal text-gray-400">FCFA/nuit</span></p>
                    {l.avg_rating > 0 && (
                      <span className="text-xs text-gray-500">★ {Number(l.avg_rating).toFixed(1)} ({l.review_count})</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Carte — cachée sur mobile si vue liste */}
        <div className={[
          'flex-1',
          view === 'list' ? 'hidden md:block' : 'block',
        ].join(' ')}>
          <MapView listings={results} hoveredId={hoveredId} />
        </div>
      </div>

      {/* ─── Bouton flottant liste/carte (mobile) ─── */}
      <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={() => setView(v => v === 'list' ? 'map' : 'list')}
          className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-full shadow-xl text-sm font-semibold active:scale-95 transition-transform"
        >
          {view === 'list' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Voir la carte
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Voir la liste
            </>
          )}
        </button>
      </div>
    </div>
  );
}
