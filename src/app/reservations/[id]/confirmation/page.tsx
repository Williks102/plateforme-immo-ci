import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConfirmationPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('immo_session')?.value;
  const session = token ? await getSession() : null;

  if (!session) redirect('/connexion');

  const result = await db.query(
    `SELECT b.*, l.title as listing_title, l.commune
     FROM bookings b
     JOIN listings l ON l.id = b.listing_id
     WHERE b.id = $1 AND b.client_id = $2`,
    [id, session.userId]
  );

  if (result.rowCount === 0) redirect('/');

  const booking = result.rows[0];
  const isPaid = booking.status === 'paid' || booking.status === 'checked_in' || booking.status === 'disbursed_to_owner';

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center">
        {isPaid ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Réservation confirmée !</h1>
            <p className="text-gray-600 mb-4">
              Vous allez recevoir une confirmation sur WhatsApp.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm mb-6">
              <p><strong>Bien :</strong> {booking.listing_title}</p>
              <p><strong>Commune :</strong> {booking.commune}</p>
              <p><strong>Arrivée :</strong> {new Date(booking.check_in).toLocaleDateString('fr-CI')}</p>
              <p><strong>Départ :</strong> {new Date(booking.check_out).toLocaleDateString('fr-CI')}</p>
              <p><strong>Montant payé :</strong> {Number(booking.total_price).toLocaleString('fr-CI')} FCFA</p>
            </div>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement en cours de traitement</h1>
            <p className="text-gray-600 mb-4 text-sm">
              Si vous avez effectué le paiement, votre réservation sera confirmée dans quelques instants.
            </p>
          </>
        )}
        <Link href="/" className="text-orange-600 font-medium">
          Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}
