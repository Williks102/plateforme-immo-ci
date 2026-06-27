import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const ADMIN_PATHS   = ['/admin', '/api/admin'];
const PRIVATE_PATHS = ['/dashboard', '/biens/nouveau', '/reservations', '/mes-biens', '/mes-reservations', '/kyc', '/profil'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CORS — bloquer les requêtes cross-origin non autorisées
  if (pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    if (origin) {
      const publicHost  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
      const isSameOrigin  = new URL(origin).host === publicHost;
      const isPaiementPro = pathname.startsWith('/api/webhooks/') &&
        origin === (process.env.PAYMENT_PRO_CALLBACK_ORIGIN ?? 'https://paiementpro.net');
      if (!isSameOrigin && !isPaiementPro) {
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
      return NextResponse.redirect(
        new URL(`/connexion?redirect=${encodeURIComponent(pathname)}`, req.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
