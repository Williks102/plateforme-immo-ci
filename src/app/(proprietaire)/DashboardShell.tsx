'use client';
import { useState } from 'react';
import OwnerSidebar from './OwnerSidebar';

interface Props {
  children: React.ReactNode;
  email: string;
  fullName: string;
  kycStatus: string;
}

export default function DashboardShell({ children, email, fullName, kycStatus }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar
        email={email}
        fullName={fullName}
        kycStatus={kycStatus}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
      <div className="flex-1 md:ml-60 min-h-screen flex flex-col">
        {/* Barre de navigation mobile */}
        <header className="md:hidden sticky top-0 z-10 bg-white border-b flex items-center gap-3 px-4 h-14 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-orange-600 text-lg">ImmoCI</span>
          <span className="text-xs text-gray-400 ml-auto">Espace propriétaire</span>
        </header>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
