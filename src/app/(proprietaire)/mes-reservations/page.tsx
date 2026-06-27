import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

const STATUS_LABELS: Record<string, string> = {
  pending:             'En attente de paiement',
  paid:                'Payé — en séquestre',
  checked_in:          'Séjour en cours',
  disbursed_to_owner:  'Versé',
  cancelled:           'Annulé',
  flagged_fraud:       'Fraude signalée',
};
const STATUS_COLORS: Record<string, string> = {
  pending:             'bg-yellow-100 text-yellow-800',
  paid:                'bg-blue-100 text-blue-800',
  checked_in:          'bg-green-100 text-green-800',
  disbursed_to_owner:  'bg-gray-100 text-gray-700',
  cancelled:           'bg-red-100 text-red-700',
  flagged_fraud:       'bg-red-200 text-red-900',
};

export default async function MesReservationsPage() {
  const session = await getSession();
  if (!session) redirect('/connexion');

  const result = await db.query(
    `SELECT b.id, b.check_in, b.check_out, b.total_price, b.montant_proprietaire,
            b.status, b.created_at,
            l.title as listing_title, l.commune,
            u.full_name as client_name, u.email as client_email
     FROM bookings b
     JOIN listings l ON l.id = b.listing_id
     JOIN users u ON u.id = b.client_id
     WHERE l.owner_id = $1
     ORDER BY b.created_at DESC`,
    [session.userId]
  );

  const bookings = result.rows;
  const totalVerses = bookings
    .filter(b => b.status === 'disbursed_to_owner')
    .reduce((s: number, b) => s + Number(b.montant_proprietaire), 0);

  const activeCount = bookings.filter(b => b.status === 'paid' || b.status === 'checked_in').length;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Réservations</h1>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
          <p className="text-sm text-gray-500">Actives</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-700">{bookings.length}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-base font-bold text-orange-600">{totalVerses.toLocaleString('fr-CI')}</p>
          <p className="text-sm text-gray-500">FCFA versés</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-500">Aucune réservation pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{b.listing_title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{b.commune}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(b.check_in).toLocaleDateString('fr-CI')} →{' '}
                    {new Date(b.check_out).toLocaleDateString('fr-CI')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Client : {b.client_name || b.client_email}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${STATUS_COLORS[b.status] ?? 'bg-gray-100'}`}>
                    {STATUS_LABELS[b.status] ?? b.status}
                  </span>
                  <p className="text-sm font-semibold text-orange-600">
                    {Number(b.montant_proprietaire ?? b.total_price * 0.92).toLocaleString('fr-CI')} FCFA
                  </p>
                  <p className="text-xs text-gray-400">Total client : {Number(b.total_price).toLocaleString('fr-CI')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
