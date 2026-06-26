import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

async function getPendingListings() {
  const result = await db.query(
    `SELECT l.id, l.title, l.commune, l.quartier, l.prix_nuitee, l.photos, l.created_at,
            u.full_name as owner_name, u.phone as owner_phone, u.kyc_status
     FROM listings l
     JOIN users u ON u.id = l.owner_id
     WHERE l.status = 'pending_review'
     ORDER BY l.created_at ASC`
  );
  return result.rows;
}

export default async function AdminListingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('immo_session')?.value;
  const session = token ? await getSession() : null;

  if (!session || session.role !== 'admin') {
    redirect('/connexion');
  }

  const listings = await getPendingListings();

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Biens en attente de validation</h1>
          <Link href="/admin" className="text-orange-600 text-sm">← Tableau de bord</Link>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucun bien en attente de validation.
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map(l => (
              <div key={l.id} className="bg-white rounded-2xl shadow p-4 flex gap-4">
                {l.photos?.[0] && (
                  <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                    <Image src={l.photos[0]} alt="" fill className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-gray-900">{l.title}</h2>
                      <p className="text-sm text-gray-500">{l.quartier ? `${l.quartier}, ` : ''}{l.commune}</p>
                      <p className="text-sm text-gray-700 mt-1">
                        {Number(l.prix_nuitee).toLocaleString('fr-CI')} FCFA/nuit
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Propriétaire : {l.owner_name ?? l.owner_phone}
                        {l.kyc_status !== 'verified' && (
                          <span className="ml-2 text-red-500">(KYC non vérifié)</span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleDateString('fr-CI')}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/admin/listings/${l.id}`}
                      className="px-4 py-2 text-sm bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
                    >
                      Voir détail
                    </Link>
                    {l.kyc_status === 'verified' && (
                      <ApproveButton listingId={l.id} />
                    )}
                    <RejectButton listingId={l.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// Client components pour les actions
function ApproveButton({ listingId }: { listingId: string }) {
  return (
    <form action={`/api/admin/listings/${listingId}/approve`} method="POST">
      <button
        type="submit"
        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg font-medium"
      >
        ✓ Valider
      </button>
    </form>
  );
}

function RejectButton({ listingId }: { listingId: string }) {
  return (
    <form action={`/api/admin/listings/${listingId}/reject`} method="POST">
      <button
        type="submit"
        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium"
      >
        ✗ Rejeter
      </button>
    </form>
  );
}
