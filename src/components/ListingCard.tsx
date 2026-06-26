import Link from 'next/link';
import Image from 'next/image';

interface ListingCardProps {
  id: string;
  title: string;
  prix_nuitee: number;
  commune: string;
  quartier?: string;
  avg_rating: number;
  review_count: number;
  cover_photo?: string;
  is_verified: boolean;
}

export function ListingCard({
  id, title, prix_nuitee, commune, quartier,
  avg_rating, review_count, cover_photo, is_verified,
}: ListingCardProps) {
  return (
    <Link href={`/listings/${id}`} className="block group">
      <div className="rounded-2xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="relative h-48 bg-gray-200">
          {cover_photo ? (
            <Image
              src={cover_photo}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-4xl">🏠</div>
          )}
          {is_verified && (
            <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
              ✓ Vérifié
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
          <p className="text-sm text-gray-500">{quartier ? `${quartier}, ` : ''}{commune}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="font-bold text-orange-600">
              {prix_nuitee.toLocaleString('fr-CI')} <span className="text-sm font-normal text-gray-500">FCFA/nuit</span>
            </p>
            {review_count > 0 && (
              <p className="text-sm text-gray-600">
                ★ {Number(avg_rating).toFixed(1)} ({review_count})
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
