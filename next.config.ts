import type { NextConfig } from 'next';

const PAYMENT_ORIGINS = [
  'https://paiementpro.net',
  'https://*.paiementpro.net',
  'https://mpayment.orange-money.com',
  'https://pay.wave.com',
  'https://www.wave.com',
].join(' ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // 'unsafe-inline' requis : Next.js injecte des scripts inline pour l'hydration
      `script-src 'self' 'unsafe-inline' https://api.mapbox.com https://www.paiementpro.net`,
      `style-src 'self' 'unsafe-inline' https://api.mapbox.com`,
      `img-src 'self' blob: data: https://*.digitaloceanspaces.com https://api.mapbox.com https://res.cloudinary.com`,
      `connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://www.paiementpro.net ${PAYMENT_ORIGINS} https://res.cloudinary.com`,
      `worker-src blob: 'self'`,
      `frame-src 'self' https://www.paiementpro.net`,
      "object-src 'none'",
      "base-uri 'self'",
      `form-action 'self' https://www.paiementpro.net`,
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'X-Frame-Options',         value: 'DENY' },
  { key: 'X-XSS-Protection',        value: '1; mode=block' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(self), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.digitaloceanspaces.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    formats: ['image/webp'],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ];
  },
};

export default nextConfig;
