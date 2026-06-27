import Link from 'next/link';
import Image from 'next/image';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

async function getMyListings(ownerId: string) {
  const result = await db.query(
    `SELECT id, title, status, is_verified, prix_nuitee, avg_rating, review_count,
            photos[1] as cover_photo, commune, quartier,
            (SELECT COUNT(*) FROM bookings b
             JOIN listings l2 ON l2.id = b.listing_id
             WHERE l2.id = listings.id AND b.status IN ('paid','checked_in')) as active_bookings
     FROM listings
     WHERE owner_id = $1
     ORDER BY created_at DESC`,
    [ownerId]
  );
  return result.rows;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  published:      { label: 'Publié',       color: 'bg-green-100 text-green-700'  },
  pending_review: { label: 'En attente',   color: 'bg-yellow-100 text-yellow-700' },
  rejected:       { label: 'Refusé',       color: 'bg-red-100 text-red-700'      },
  draft:          { label: 'Brouillon',    color: 'bg-gray-100 text-gray-600'    },
};

export default async function MesBiensPage() {
  const session = await getSession();
  if (!session) redirect('/connexion');

  const listings = await getMyListings(session.userId);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes biens ({listings.length})</h1>
        <Link
          href="/biens/nouveau"
          className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors"
        >
          + Nouveau bien
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-gray-600 font-medium mb-2">Vous n'avez pas encore de bien</p>
          <p className="text-sm text-gray-400 mb-6">Publiez votre premier bien et commencez à recevoir des réservations.</p>
          <Link
            href="/biens/nouveau"
            className="inline-block px-6 py-3 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors"
          >
            Publier mon premier bien →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map(l => {
            const sc = STATUS_CONFIG[l.status] ?? { label: l.status, color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={l.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex gap-0 hover:shadow-md transition-shadow">
                {l.cover_photo ? (
                  <div className="relative w-32 h-28 flex-shrink-0">
                    <Image src={l.cover_photo} alt={l.title} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-32 h-28 flex-shrink-0 bg-gray-100 flex items-center justify-center text-gray-300 text-3xl">🏠</div>
                )}
                <div className="flex-1 p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-gray-900 truncate">{l.title}</h2>
                      {l.is_verified && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0">✓ Vérifié</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{l.quartier ? `${l.quartier}, ` : ''}{l.commune}</p>
                    <p className="text-sm font-semibold text-orange-600 mt-1">
                      {Number(l.prix_nuitee).toLocaleString('fr-CI')} FCFA/nuit
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {l.avg_rating > 0 && <span>★ {Number(l.avg_rating).toFixed(1)} ({l.review_count} avis)</span>}
                      {Number(l.active_bookings) > 0 && (
                        <span className="text-blue-600 font-medium">{l.active_bookings} réservation{Number(l.active_bookings) > 1 ? 's' : ''} active{Number(l.active_bookings) > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {l.status === 'rejected' && (
                      <p className="text-xs text-red-600 mt-1">Refusé — corrigez et resoumettez</p>
                    )}
                    {l.status === 'pending_review' && (
                      <p className="text-xs text-yellow-600 mt-1">En cours de vérification par notre équipe</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                    <Link
                      href={`/listings/${l.id}`}
                      className="text-xs text-gray-500 hover:text-orange-600 transition-colors"
                    >
                      Voir →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
