import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

async function getDashboardStats() {
  const [pending, published, bookings, fraud, kycPending] = await Promise.all([
    db.query(`SELECT COUNT(*) FROM listings WHERE status = 'pending_review'`),
    db.query(`SELECT COUNT(*) FROM listings WHERE status = 'published'`),
    db.query(`SELECT COUNT(*) FROM bookings WHERE status IN ('paid','checked_in')`),
    db.query(`SELECT COUNT(*) FROM bookings WHERE status = 'flagged_fraud' AND updated_at > NOW() - INTERVAL '24 hours'`),
    db.query(`SELECT COUNT(*) FROM users WHERE kyc_status = 'id_submitted'`),
  ]);

  return {
    pending:    Number(pending.rows[0].count),
    published:  Number(published.rows[0].count),
    bookings:   Number(bookings.rows[0].count),
    fraud:      Number(fraud.rows[0].count),
    kycPending: Number(kycPending.rows[0].count),
  };
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('immo_session')?.value;
  const session = token ? await getSession() : null;

  if (!session || session.role !== 'admin') redirect('/connexion');

  const stats = await getDashboardStats();

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord admin</h1>
          <Link href="/admin/totp-setup" className="text-sm text-orange-600 hover:underline">
            Configurer 2FA →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-500">En attente</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-green-600">{stats.published}</p>
            <p className="text-sm text-gray-500">Publiés</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.bookings}</p>
            <p className="text-sm text-gray-500">Réservations</p>
          </div>
          <div className={`rounded-2xl p-4 shadow-sm text-center ${stats.kycPending > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-white'}`}>
            <p className={`text-3xl font-bold ${stats.kycPending > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{stats.kycPending}</p>
            <p className="text-sm text-gray-500">KYC en attente</p>
          </div>
          {stats.fraud > 0 ? (
            <div className="bg-red-50 rounded-2xl p-4 shadow-sm text-center border border-red-200">
              <p className="text-3xl font-bold text-red-600">{stats.fraud}</p>
              <p className="text-sm text-red-600">Fraudes 24h</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-gray-300">0</p>
              <p className="text-sm text-gray-400">Fraudes 24h</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/listings" className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-gray-900 mb-1">Modération des biens</h2>
            <p className="text-sm text-gray-500">{stats.pending} bien{stats.pending !== 1 ? 's' : ''} en attente de validation</p>
          </Link>

          <Link href="/admin/kyc" className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-gray-900 mb-1">Vérifications KYC</h2>
            <p className="text-sm text-gray-500">{stats.kycPending} document{stats.kycPending !== 1 ? 's' : ''} à examiner</p>
          </Link>

          <Link href="/admin/audit" className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-gray-900 mb-1">Journal d'audit</h2>
            <p className="text-sm text-gray-500">Historique des actions admin</p>
          </Link>

          <Link href="/admin/totp-setup" className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-gray-900 mb-1">Sécurité 2FA (TOTP)</h2>
            <p className="text-sm text-gray-500">Configurer l'authentification à deux facteurs</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
