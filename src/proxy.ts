import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';


const ADMIN_PATHS   = ['/admin', '/api/admin'];
const PRIVATE_PATHS = ['/dashboard', '/biens/nouveau', '/reservations'];

const PAYMENT_ORIGINS = [
  'https://*.paiementpro.net',
  'https://paiementpro.net',
  'https://mpayment.orange-money.com',
  'https://pay.wave.com',
  'https://www.wave.com',
].join(' ');

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://api.mapbox.com https://www.paiementpro.net`,
    `style-src 'self' 'unsafe-inline' https://api.mapbox.com`,
    `img-src 'self' blob: data: https://*.digitaloceanspaces.com https://api.mapbox.com`,
    `connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://www.paiementpro.net ${PAYMENT_ORIGINS}`,
    `frame-src 'self' https://www.paiementpro.net`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' https://www.paiementpro.net`,
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Nonce CSP — généré par requête, jamais statique
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp   = buildCsp(nonce);

  // Passer le nonce à Next.js (il l'injecte dans ses scripts inline)
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-nonce', nonce);

  // CORS — bloquer uniquement les requêtes cross-origin non autorisées
  if (pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    if (origin) {
      const isSameOrigin = new URL(origin).host === req.nextUrl.host;
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
      return NextResponse.redirect(new URL(`/connexion?redirect=${encodeURIComponent(pathname)}`, req.url));
    }
  }

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export const config = {
  // Couvre toutes les pages — exclut les assets statiques Next.js
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
