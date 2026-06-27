'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/dashboard',          label: 'Tableau de bord', icon: '📊' },
  { href: '/mes-biens',          label: 'Mes biens',       icon: '🏠' },
  { href: '/mes-reservations',   label: 'Réservations',    icon: '📅' },
  { href: '/kyc',                label: 'Vérification KYC',icon: '🪪' },
  { href: '/profil',             label: 'Mon profil',      icon: '👤' },
];

interface Props {
  email: string;
  fullName: string;
  kycStatus: string;
}

export default function OwnerSidebar({ email, fullName, kycStatus }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const kycNeedsAction = kycStatus === 'unverified' || kycStatus === 'rejected';

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-100 flex flex-col z-20 shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/" className="text-lg font-bold text-orange-600">ImmoCI</Link>
        <p className="text-xs text-gray-400 mt-0.5">Espace propriétaire</p>
      </div>

      {/* Profil rapide */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-orange-700 font-bold text-sm">{email[0].toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{fullName || email.split('@')[0]}</p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);
          const showBadge = item.href === '/kyc' && kycNeedsAction;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-base">{item.icon}</span>
                {item.label}
              </span>
              {showBadge && (
                <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bouton publier */}
      <div className="px-4 pb-2">
        <Link
          href="/biens/nouveau"
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors"
        >
          + Publier un bien
        </Link>
      </div>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <span>🌐</span> Retour au site
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <span>🚪</span> Déconnexion
        </button>
      </div>
    </aside>
  );
}
