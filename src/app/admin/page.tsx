import Link from 'next/link';
import { db } from '@/lib/db';

async function getStats() {
  const [pending, published, bookings, fraud, kycPending, users] = await Promise.all([
    db.query(`SELECT COUNT(*) FROM listings WHERE status = 'pending_review'`),
    db.query(`SELECT COUNT(*) FROM listings WHERE status = 'published'`),
    db.query(`SELECT COUNT(*) FROM bookings WHERE status IN ('paid','checked_in')`),
    db.query(`SELECT COUNT(*) FROM bookings WHERE status = 'flagged_fraud' AND updated_at > NOW() - INTERVAL '24 hours'`),
    db.query(`SELECT COUNT(*) FROM users WHERE kyc_status = 'id_submitted'`),
    db.query(`SELECT COUNT(*) FROM users`),
  ]);
  return {
    pending:    Number(pending.rows[0].count),
    published:  Number(published.rows[0].count),
    bookings:   Number(bookings.rows[0].count),
    fraud:      Number(fraud.rows[0].count),
    kycPending: Number(kycPending.rows[0].count),
    users:      Number(users.rows[0].count),
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Tableau de bord</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Biens en attente',     value: stats.pending,    color: 'text-yellow-600', bg: stats.pending > 0 ? 'border-yellow-200' : '' },
          { label: 'Biens publiés',        value: stats.published,  color: 'text-green-600',  bg: '' },
          { label: 'Réservations actives', value: stats.bookings,   color: 'text-blue-600',   bg: '' },
          { label: 'Utilisateurs',         value: stats.users,      color: 'text-gray-700',   bg: '' },
          { label: 'KYC en attente',       value: stats.kycPending, color: 'text-orange-600', bg: stats.kycPending > 0 ? 'border-orange-200' : '' },
          { label: 'Fraudes 24h',          value: stats.fraud,      color: 'text-red-600',    bg: stats.fraud > 0 ? 'border-red-200 bg-red-50' : '' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl p-5 shadow-sm border ${s.bg || 'border-transparent'}`}>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Accès rapides */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Accès rapides</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/listings" className="bg-white rounded-2xl p-6 shadow-sm border border-transparent hover:border-orange-200 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏠</span>
            <h3 className="font-semibold text-gray-900 group-hover:text-orange-600">Modération des biens</h3>
          </div>
          <p className="text-sm text-gray-500">{stats.pending} bien{stats.pending !== 1 ? 's' : ''} en attente de validation</p>
        </Link>

        <Link href="/admin/users" className="bg-white rounded-2xl p-6 shadow-sm border border-transparent hover:border-orange-200 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">👥</span>
            <h3 className="font-semibold text-gray-900 group-hover:text-orange-600">Gestion des utilisateurs</h3>
          </div>
          <p className="text-sm text-gray-500">{stats.users} utilisateur{stats.users !== 1 ? 's' : ''} inscrits</p>
        </Link>

        <Link href="/admin/kyc" className="bg-white rounded-2xl p-6 shadow-sm border border-transparent hover:border-orange-200 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🪪</span>
            <h3 className="font-semibold text-gray-900 group-hover:text-orange-600">Vérifications KYC</h3>
          </div>
          <p className="text-sm text-gray-500">{stats.kycPending} document{stats.kycPending !== 1 ? 's' : ''} à examiner</p>
        </Link>

        <Link href="/admin/audit" className="bg-white rounded-2xl p-6 shadow-sm border border-transparent hover:border-orange-200 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📋</span>
            <h3 className="font-semibold text-gray-900 group-hover:text-orange-600">Journal d'audit</h3>
          </div>
          <p className="text-sm text-gray-500">Historique complet des actions admin</p>
        </Link>
      </div>
    </div>
  );
}
