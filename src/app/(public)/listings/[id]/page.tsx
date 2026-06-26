import { notFound } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/db';
import { BookingWidget } from './BookingWidget';

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
    listing.has_water_pump && '💧 Suppresseur d\'eau',
    listing.has_split_ac   && '❄️ Climatisation split',
    listing.has_wifi       && '📶 WiFi',
    listing.has_parking    && '🚗 Parking',
    listing.has_pool       && '🏊 Piscine',
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Photos */}
        {listing.photos?.length > 0 && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden mb-6 h-72">
            <div className="relative col-span-1 row-span-2">
              <Image src={listing.photos[0]} alt={listing.title} fill className="object-cover" />
            </div>
            {listing.photos.slice(1, 3).map((photo: string, i: number) => (
              <div key={i} className="relative">
                <Image src={photo} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info principale */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  {listing.is_verified && (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">
                      ✓ Bien vérifié
                    </span>
                  )}
                  <h1 className="text-2xl font-bold text-gray-900 mt-2">{listing.title}</h1>
                  <p className="text-gray-500">{listing.quartier ? `${listing.quartier}, ` : ''}{listing.commune}</p>
                </div>
                {listing.review_count > 0 && (
                  <div className="text-right">
                    <p className="font-semibold">★ {Number(listing.avg_rating).toFixed(1)}</p>
                    <p className="text-sm text-gray-500">{listing.review_count} avis</p>
                  </div>
                )}
              </div>
              <p className="text-gray-600 mt-4">{listing.description}</p>
            </div>

            {/* Infos clés */}
            <div className="flex gap-4 text-sm text-gray-700">
              <span>🛏 {listing.nb_chambres} chambre{listing.nb_chambres > 1 ? 's' : ''}</span>
              <span>🚿 {listing.nb_salles_bain} salle{listing.nb_salles_bain > 1 ? 's' : ''} de bain</span>
            </div>

            {/* Équipements */}
            {amenities.length > 0 && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">Équipements</h2>
                <div className="grid grid-cols-2 gap-2">
                  {amenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      {a}
                    </div>
                  ))}
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
                        <span className="text-yellow-500">{'★'.repeat(r.rating)}</span>
                      </div>
                      <p className="text-sm text-gray-600">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Widget réservation */}
          <div className="lg:col-span-1">
            <BookingWidget listingId={id} prixNuitee={Number(listing.prix_nuitee)} />
          </div>
        </div>
      </div>
    </main>
  );
}
