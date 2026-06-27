'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin',          label: 'Dashboard',        icon: '📊' },
  { href: '/admin/listings', label: 'Biens',            icon: '🏠' },
  { href: '/admin/users',    label: 'Utilisateurs',     icon: '👥' },
  { href: '/admin/kyc',      label: 'KYC',              icon: '🪪' },
  { href: '/admin/audit',    label: "Journal d'audit",  icon: '📋' },
  { href: '/admin/totp-setup', label: 'Sécurité 2FA',  icon: '🔐' },
];

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/connexion');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-gray-900 text-white flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-700">
        <p className="text-lg font-bold text-orange-400">ImmoCI</p>
        <p className="text-xs text-gray-400 mt-0.5">Administration</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(item => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-700 space-y-1">
        <p className="px-3 text-xs text-gray-500 truncate mb-2">{email}</p>
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>🏡</span> Retour au site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
        >
          <span>🚪</span> Déconnexion
        </button>
      </div>
    </aside>
  );
}
