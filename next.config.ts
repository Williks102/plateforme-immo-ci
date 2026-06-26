import type { NextConfig } from 'next';

const PAYMENT_ORIGINS = [
  'https://*.paiementpro.net',
  'https://paiementpro.net',
  'https://mpayment.orange-money.com',
  'https://multi.app.orange-money.com',
  'https://maxit-link.com',
  'https://pay.wave.com',
  'https://www.wave.com',
  'https://*.confirm.wave.com',
];

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' https://api.mapbox.com https://www.paiementpro.net`,
      `style-src 'self' 'unsafe-inline' https://api.mapbox.com`,
      `img-src 'self' blob: data: https://*.digitaloceanspaces.com https://api.mapbox.com https://www.paiementpro.net`,
      `connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://www.paiementpro.net ${PAYMENT_ORIGINS.join(' ')}`,
      `frame-src 'self' https://www.paiementpro.net`,
      "object-src 'none'",
      "base-uri 'self'",
      `form-action 'self' https://www.paiementpro.net`,
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.digitaloceanspaces.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
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
