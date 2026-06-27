import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import OwnerSidebar from './OwnerSidebar';

export default async function ProprietaireLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect('/connexion?redirect=/dashboard');
  if (session.role === 'client') redirect('/reservations');
  if (session.role === 'admin')  redirect('/admin');

  const userRow = await db.query(
    'SELECT full_name, kyc_status FROM users WHERE id = $1',
    [session.userId]
  );
  const fullName  = userRow.rows[0]?.full_name  ?? '';
  const kycStatus = userRow.rows[0]?.kyc_status ?? 'unverified';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar email={session.email} fullName={fullName} kycStatus={kycStatus} />
      <div className="flex-1 ml-60 min-h-screen">
        {children}
      </div>
    </div>
  );
}
