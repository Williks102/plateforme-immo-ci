import Link from 'next/link';
import { getSession } from '@/lib/auth';
import NavbarMenu from './NavbarMenu';

export default async function Navbar() {
  const session = await getSession();
  const sessionData = session
    ? { role: session.role, email: session.email }
    : null;

  return (
    <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-orange-600 flex-shrink-0">ImmoCI</Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/recherche" className="text-sm text-gray-600 hover:text-orange-600 transition-colors">
              Rechercher
            </Link>
            <Link href="/biens/nouveau" className="text-sm text-gray-600 hover:text-orange-600 transition-colors">
              Louer mon bien
            </Link>
          </nav>
        </div>
        <NavbarMenu session={sessionData} />
      </div>
    </header>
  );
}
