import Link from 'next/link';
import { db } from '@/lib/db';
import { ListingCard } from '@/components/ListingCard';

const COMMUNES = [
  'Cocody', 'Plateau', 'Marcory', 'Treichville', 'Adjamé',
  'Yopougon', 'Koumassi', 'Port-Bouët', 'Abobo', 'Attécoubé',
  'Bingerville', 'Songon',
];

interface SearchParams {
  commune?: string;
  prix_min?: string;
  prix_max?: string;
  nb_chambres?: string;
  has_wifi?: string;
  has_generator?: string;
  has_split_ac?: string;
  is_verified?: string;
}

async function searchListings(sp: SearchParams) {
  const params: unknown[] = [
    sp.commune || null,
    sp.prix_min ? Number(sp.prix_min) : null,
    sp.prix_max ? Number(sp.prix_max) : null,
    sp.nb_chambres ? Number(sp.nb_chambres) : null,
    sp.has_generator === '1' ? true : null,
    sp.has_wifi === '1' ? true : null,
    sp.has_split_ac === '1' ? true : null,
    sp.is_verified === '1' ? true : null,
    20, // limit
    0,  // offset
  ];

  const result = await db.query(
    `SELECT id, title, prix_nuitee, commune, quartier, avg_rating, review_count,
            photos[1] as cover_photo, is_verified
     FROM v_published_listings
     WHERE ($1::text IS NULL OR commune = $1)
       AND ($2::numeric IS NULL OR prix_nuitee >= $2)
       AND ($3::numeric IS NULL OR prix_nuitee <= $3)
       AND ($4::int IS NULL OR nb_chambres >= $4)
       AND ($5::boolean IS NULL OR has_generator = $5)
       AND ($6::boolean IS NULL OR has_wifi = $6)
       AND ($7::boolean IS NULL OR has_split_ac = $7)
       AND ($8::boolean IS NULL OR is_verified = $8)
     ORDER BY is_verified DESC, avg_rating DESC
     LIMIT $9 OFFSET $10`,
    params
  );
  return result.rows;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function RecherchePage({ searchParams }: Props) {
  const sp = await searchParams;
  let listings: Record<string, unknown>[] = [];
  try {
    listings = await searchListings(sp);
  } catch {
    listings = [];
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-orange-600">ImmoCI</Link>
          <span className="text-gray-400">/ Recherche</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filtres */}
        <form className="bg-white rounded-2xl shadow p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <select name="commune" defaultValue={sp.commune ?? ''} className="px-3 py-2 border rounded-xl text-sm">
            <option value="">Toutes communes</option>
            {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <input
            type="number"
            name="prix_min"
            defaultValue={sp.prix_min}
            placeholder="Prix min (FCFA)"
            className="px-3 py-2 border rounded-xl text-sm"
          />

          <input
            type="number"
            name="prix_max"
            defaultValue={sp.prix_max}
            placeholder="Prix max (FCFA)"
            className="px-3 py-2 border rounded-xl text-sm"
          />

          <select name="nb_chambres" defaultValue={sp.nb_chambres ?? ''} className="px-3 py-2 border rounded-xl text-sm">
            <option value="">Toutes chambres</option>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+ chambre{n > 1 ? 's' : ''}</option>)}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="has_wifi" value="1" defaultChecked={sp.has_wifi === '1'} />
            WiFi
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="has_generator" value="1" defaultChecked={sp.has_generator === '1'} />
            Groupe élec.
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="has_split_ac" value="1" defaultChecked={sp.has_split_ac === '1'} />
            Climatisation
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_verified" value="1" defaultChecked={sp.is_verified === '1'} />
            Vérifiés uniquement
          </label>

          <button
            type="submit"
            className="col-span-2 md:col-span-4 bg-orange-600 text-white py-2 rounded-xl text-sm font-semibold"
          >
            Rechercher
          </button>
        </form>

        {/* Résultats */}
        <p className="text-sm text-gray-500 mb-4">{listings.length} bien{listings.length > 1 ? 's' : ''} trouvé{listings.length > 1 ? 's' : ''}</p>

        {listings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🔍</p>
            <p>Aucun bien ne correspond à vos critères.</p>
            <Link href="/recherche" className="text-orange-600 mt-2 inline-block">Effacer les filtres</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map(l => (
              <ListingCard key={l.id as string} {...(l as unknown as Parameters<typeof ListingCard>[0])} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
