'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Props {
  session: { role: string; email: string } | null;
}

const ROLE_HOME: Record<string, string> = {
  admin:        '/admin',
  proprietaire: '/dashboard',
  client:       '/reservations',
};

export default function NavbarMenu({ session }: Props) {
  const router  = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const logout = async () => {
    setOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/connexion" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors">
          Connexion
        </Link>
        <Link href="/inscription" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-orange-600 hidden sm:block transition-colors">
          S'inscrire
        </Link>
        <Link href="/biens/nouveau" className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors">
          Publier un bien
        </Link>
      </div>
    );
  }

  const homeUrl = ROLE_HOME[session.role] ?? '/';
  const initial = session.email[0].toUpperCase();

  return (
    <div className="flex items-center gap-2">
      {session.role === 'proprietaire' && (
        <Link
          href="/biens/nouveau"
          className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors hidden sm:block"
        >
          + Publier
        </Link>
      )}

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-orange-700 text-sm font-bold">{initial}</span>
          </div>
          <span className="text-sm font-medium text-gray-700 hidden md:block max-w-[120px] truncate">
            {session.email.split('@')[0]}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-2 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 mb-1">
              <p className="text-xs text-gray-500">Connecté en tant que</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{session.email}</p>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                session.role === 'admin'        ? 'bg-purple-100 text-purple-700' :
                session.role === 'proprietaire' ? 'bg-blue-100 text-blue-700'    :
                'bg-gray-100 text-gray-600'
              }`}>
                {session.role}
              </span>
            </div>

            <Link
              href={homeUrl}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>🏠</span>
              {session.role === 'admin' ? 'Administration' :
               session.role === 'proprietaire' ? 'Mon espace propriétaire' : 'Mes réservations'}
            </Link>

            <Link
              href="/profil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>👤</span> Mon profil
            </Link>

            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <span>🚪</span> Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
