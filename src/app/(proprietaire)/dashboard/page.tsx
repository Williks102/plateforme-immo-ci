import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

async function getOwnerStats(ownerId: string) {
  const [bookings, listings] = await Promise.all([
    db.query(
      `SELECT b.id, b.check_in, b.check_out, b.total_price, b.status, b.created_at,
              l.title as listing_title
       FROM bookings b
       JOIN listings l ON l.id = b.listing_id
       WHERE l.owner_id = $1
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [ownerId]
    ),
    db.query(
      `SELECT id, title, status, is_verified, prix_nuitee, avg_rating, review_count
       FROM listings WHERE owner_id = $1 ORDER BY created_at DESC`,
      [ownerId]
    ),
  ]);

  return { bookings: bookings.rows, listings: listings.rows };
}

const STATUS_LABELS: Record<string, string> = {
  pending:              'En attente de paiement',
  paid:                 'Payé — en séquestre',
  checked_in:          'Séjour en cours',
  disbursed_to_owner:  'Versé',
  cancelled:           'Annulé',
  flagged_fraud:       'Fraude signalée',
};

const STATUS_COLORS: Record<string, string> = {
  pending:             'bg-yellow-100 text-yellow-800',
  paid:                'bg-blue-100 text-blue-800',
  checked_in:         'bg-green-100 text-green-800',
  disbursed_to_owner: 'bg-gray-100 text-gray-700',
  cancelled:          'bg-red-100 text-red-700',
  flagged_fraud:      'bg-red-200 text-red-900',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('immo_session')?.value;
  const session = token ? await getSession() : null;

  if (!session) redirect('/connexion?redirect=/dashboard');
  if (session.role === 'client') redirect('/reservations');
  if (session.role === 'admin')  redirect('/admin');

  const sp = await searchParams;
  const { bookings, listings } = await getOwnerStats(session.userId);

  const totalRevenu = bookings
    .filter(b => b.status === 'disbursed_to_owner')
    .reduce((sum: number, b) => sum + Number(b.total_price) * 0.92, 0);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Mon espace propriétaire</h1>
          <Link href="/biens/nouveau" className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg">
            + Nouveau bien
          </Link>
        </div>

        {sp.submitted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
            ✅ Votre bien a été soumis pour validation. Vous recevrez une notification WhatsApp dès qu'il sera publié.
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-orange-600">{listings.length}</p>
            <p className="text-sm text-gray-500">Bien{listings.length > 1 ? 's' : ''} publiés</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-orange-600">{bookings.filter(b => b.status === 'paid' || b.status === 'checked_in').length}</p>
            <p className="text-sm text-gray-500">Réservations actives</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-lg font-bold text-orange-600">{totalRevenu.toLocaleString('fr-CI')} FCFA</p>
            <p className="text-sm text-gray-500">Revenus versés</p>
          </div>
        </div>

        {/* Mes biens */}
        {listings.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Mes biens</h2>
            <div className="space-y-2">
              {listings.map((l) => (
                <div key={l.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="font-medium">{l.title}</p>
                    <p className="text-sm text-gray-500">
                      {Number(l.prix_nuitee).toLocaleString('fr-CI')} FCFA/nuit
                      {l.avg_rating > 0 && ` · ★ ${Number(l.avg_rating).toFixed(1)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.is_verified && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Vérifié</span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      l.status === 'published' ? 'bg-green-100 text-green-800' :
                      l.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {l.status === 'published' ? 'Publié' :
                       l.status === 'pending_review' ? 'En attente' : l.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Réservations */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Réservations récentes</h2>
          {bookings.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune réservation pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => (
                <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{b.listing_title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(b.check_in).toLocaleDateString('fr-CI')} →{' '}
                        {new Date(b.check_out).toLocaleDateString('fr-CI')}
                      </p>
                      <p className="text-sm font-semibold text-orange-600 mt-1">
                        {Number(b.total_price).toLocaleString('fr-CI')} FCFA
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[b.status] ?? 'bg-gray-100'}`}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
