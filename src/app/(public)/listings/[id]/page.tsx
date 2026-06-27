import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/db';
import { BookingWidget } from './BookingWidget';
import Navbar from '@/components/Navbar';

interface Props {
  params: Promise<{ id: string }>;
}

async function getListing(id: string) {
  const result = await db.query(
    `SELECT l.*, u.full_name as owner_name
     FROM listings l
     JOIN users u ON u.id = l.owner_id
     WHERE l.id = $1 AND l.status = 'published'`,
    [id]
  );
  return result.rows[0] ?? null;
}

async function getReviews(id: string) {
  const result = await db.query(
    `SELECT r.rating, r.comment, r.created_at,
            SPLIT_PART(u.full_name, ' ', 1) || ' ' ||
            SUBSTRING(SPLIT_PART(u.full_name, ' ', 2), 1, 1) || '.' as reviewer_name
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.listing_id = $1 AND r.is_visible = TRUE
     ORDER BY r.created_at DESC LIMIT 10`,
    [id]
  );
  return result.rows;
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const [listing, reviews] = await Promise.all([getListing(id), getReviews(id)]);

  if (!listing) notFound();

  const amenities = [
    listing.has_generator  && '⚡ Groupe électrogène',
    listing.has_water_pump && "💧 Suppresseur d'eau",
    listing.has_split_ac   && '❄️ Climatisation split',
    listing.has_wifi       && '📶 WiFi',
    listing.has_parking    && '🚗 Parking',
    listing.has_pool       && '🏊 Piscine',
  ].filter(Boolean);

  const remiseSemainePct = Number(listing.remise_semaine_pct ?? 0);
  const remiseMoisPct    = Number(listing.remise_mois_pct    ?? 0);
  const prixNuitee       = Number(listing.prix_nuitee);

  return (
    <>
      <Navbar />
      {/* Barre sticky de réservation — mobile uniquement */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-lg px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-bold text-orange-600 text-base">
            {prixNuitee.toLocaleString('fr-CI')} FCFA
          </p>
          <p className="text-xs text-gray-400">/ nuit</p>
        </div>
        <a
          href="#booking-widget"
          className="bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm active:scale-95 transition-transform"
        >
          Réserver
        </a>
      </div>

      <main className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-6">

          {/* Galerie photos */}
          {listing.photos?.length > 0 && (
            <div className="rounded-2xl overflow-hidden mb-6">
              {/* Mobile : scroll horizontal */}
              <div className="md:hidden flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1">
                {listing.photos.map((photo: string, i: number) => (
                  <div key={i} className="relative w-80 h-56 flex-shrink-0 snap-start rounded-xl overflow-hidden">
                    <Image src={photo} alt={i === 0 ? listing.title : ''} fill className="object-cover" />
                  </div>
                ))}
              </div>
              {/* Desktop : grille */}
              <div className="hidden md:grid grid-cols-2 gap-2 h-72">
                <div className="relative">
                  <Image src={listing.photos[0]} alt={listing.title} fill className="object-cover" />
                </div>
                <div className="grid grid-rows-2 gap-2">
                  {listing.photos.slice(1, 3).map((photo: string, i: number) => (
                    <div key={i} className="relative">
                      <Image src={photo} alt="" fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Infos principales */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {listing.is_verified && (
                      <span className="inline-block text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full mb-2">
                        ✓ Bien vérifié
                      </span>
                    )}
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">{listing.title}</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                      {listing.quartier ? `${listing.quartier}, ` : ''}{listing.commune}
                    </p>
                  </div>
                  {listing.review_count > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900">★ {Number(listing.avg_rating).toFixed(1)}</p>
                      <p className="text-xs text-gray-500">{listing.review_count} avis</p>
                    </div>
                  )}
                </div>
                {listing.description && (
                  <p className="text-gray-600 mt-4 text-sm leading-relaxed">{listing.description}</p>
                )}
              </div>

              {/* Infos clés */}
              <div className="flex gap-4 text-sm text-gray-700 flex-wrap">
                <span>🛏 {listing.nb_chambres} chambre{listing.nb_chambres > 1 ? 's' : ''}</span>
                <span>🚿 {listing.nb_salles_bain} salle{listing.nb_salles_bain > 1 ? 's' : ''} de bain</span>
              </div>

              {/* Équipements */}
              {amenities.length > 0 && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-3">Équipements</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {amenities.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarifs dégressifs */}
              {(remiseSemainePct > 0 || remiseMoisPct > 0) && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-3">Offres spéciales</h2>
                  <div className="space-y-2">
                    {remiseSemainePct > 0 && (
                      <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3 text-sm">
                        <span className="text-xl">🗓️</span>
                        <div>
                          <p className="font-medium text-green-800">-{remiseSemainePct}% pour 7 nuits et plus</p>
                          <p className="text-xs text-green-600">
                            Soit {Math.round(prixNuitee * (1 - remiseSemainePct / 100)).toLocaleString('fr-CI')} FCFA/nuit
                          </p>
                        </div>
                      </div>
                    )}
                    {remiseMoisPct > 0 && (
                      <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3 text-sm">
                        <span className="text-xl">📅</span>
                        <div>
                          <p className="font-medium text-blue-800">-{remiseMoisPct}% pour 30 nuits et plus</p>
                          <p className="text-xs text-blue-600">
                            Soit {Math.round(prixNuitee * (1 - remiseMoisPct / 100)).toLocaleString('fr-CI')} FCFA/nuit
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Avis */}
              {reviews.length > 0 && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-3">Avis des voyageurs</h2>
                  <div className="space-y-4">
                    {reviews.map((r, i) => (
                      <div key={i} className="border-b pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{r.reviewer_name}</span>
                          <span className="text-yellow-500 text-sm">{'★'.repeat(r.rating)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lien retour */}
              <div className="pt-2">
                <Link href="/recherche" className="text-sm text-orange-600 hover:underline">
                  ← Retour à la recherche
                </Link>
              </div>
            </div>

            {/* Widget réservation — colonne droite desktop */}
            <div className="lg:col-span-1">
              <BookingWidget
                listingId={id}
                prixNuitee={prixNuitee}
                remiseSemainePct={remiseSemainePct}
                remiseMoisPct={remiseMoisPct}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
