import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('immo_session')?.value;
  const session = token ? await getSession() : null;

  if (!session || session.role !== 'admin') {
    redirect('/connexion?redirect=/admin');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar email={session.email} />
      <div className="flex-1 ml-60 min-h-screen">
        {children}
      </div>
    </div>
  );
}
