import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const allowedOrigins = [
  process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
].filter(Boolean);

const ADMIN_PATHS   = ['/admin', '/api/admin'];
const PRIVATE_PATHS = ['/dashboard', '/biens/nouveau', '/reservations'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CORS — bloquer les origines non whitelistées sur les routes API
  if (pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    if (origin && !allowedOrigins.includes(origin)) {
      // Autoriser le callback PaiementPro
      const paiementProOrigin = process.env.PAYMENT_PRO_CALLBACK_ORIGIN ?? 'https://paiementpro.net';
      if (!(pathname.startsWith('/api/webhooks/') && origin === paiementProOrigin)) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }
  }

  // Protection routes admin
  if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    const session = await getSession(req);
    if (!session || session.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/connexion', req.url));
    }
  }

  // Protection routes privées
  if (PRIVATE_PATHS.some(p => pathname.startsWith(p))) {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.redirect(new URL(`/connexion?redirect=${encodeURIComponent(pathname)}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/biens/:path*',
    '/reservations/:path*',
    '/api/admin/:path*',
    '/api/bookings/:path*',
    '/api/listings/:path*',
    '/api/upload',
  ],
};
