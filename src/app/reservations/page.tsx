import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import Navbar from '@/components/Navbar';

const STATUS_LABELS: Record<string, string> = {
  pending:             'En attente de paiement',
  paid:                'Confirmée',
  checked_in:         'Séjour en cours',
  disbursed_to_owner: 'Terminée',
  cancelled:          'Annulée',
  flagged_fraud:      'Fraude signalée',
};
const STATUS_COLORS: Record<string, string> = {
  pending:             'bg-yellow-100 text-yellow-800',
  paid:                'bg-green-100 text-green-800',
  checked_in:         'bg-blue-100 text-blue-800',
  disbursed_to_owner: 'bg-gray-100 text-gray-700',
  cancelled:          'bg-red-100 text-red-700',
  flagged_fraud:      'bg-red-200 text-red-900',
};

export default async function ReservationsPage() {
  const session = await getSession();
  if (!session) redirect('/connexion?redirect=/reservations');

  if (session.role === 'proprietaire') redirect('/dashboard');
  if (session.role === 'admin')        redirect('/admin');

  const result = await db.query(
    `SELECT b.id, b.check_in, b.check_out, b.total_price, b.status, b.created_at,
            l.title, l.commune, l.photos
     FROM bookings b
     JOIN listings l ON l.id = b.listing_id
     WHERE b.client_id = $1
     ORDER BY b.created_at DESC`,
    [session.userId]
  );

  const reservations = result.rows;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>
            <Link href="/recherche" className="text-sm text-orange-600 hover:underline">
              Chercher un logement
            </Link>
          </div>

          {reservations.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
              <p className="text-gray-500 mb-4">Vous n'avez pas encore de réservation.</p>
              <Link
                href="/recherche"
                className="inline-block bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-orange-700 transition-colors"
              >
                Parcourir les logements
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map(r => {
                const photo = Array.isArray(r.photos) ? r.photos[0] : null;
                return (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex gap-4 p-4">
                      {photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={r.title}
                          className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900 truncate">{r.title}</p>
                          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[r.status] ?? 'bg-gray-100'}`}>
                            {STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{r.commune}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(r.check_in).toLocaleDateString('fr-CI')} →{' '}
                          {new Date(r.check_out).toLocaleDateString('fr-CI')}
                        </p>
                        <p className="text-sm font-semibold text-orange-600 mt-1">
                          {Number(r.total_price).toLocaleString('fr-CI')} FCFA
                        </p>
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div className="border-t px-4 py-2 bg-yellow-50">
                        <Link
                          href={`/reservations/${r.id}/confirmation`}
                          className="text-sm text-yellow-700 font-medium hover:underline"
                        >
                          Finaliser le paiement →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
