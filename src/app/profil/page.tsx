import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import Navbar from '@/components/Navbar';
import ProfilClient from './ProfilClient';

export default async function ProfilPage() {
  const session = await getSession();
  if (!session) redirect('/connexion?redirect=/profil');

  const result = await db.query(
    'SELECT id, full_name, email, phone, role, kyc_status, created_at FROM users WHERE id = $1',
    [session.userId]
  );

  if (result.rowCount === 0) redirect('/connexion');

  const user = result.rows[0];

  return (
    <>
      <Navbar />
      <ProfilClient initialUser={user} />
    </>
  );
}
