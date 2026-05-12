import { withSentryConfig } from '@sentry/nextjs';

const isDev = process.env.NODE_ENV !== 'production';

// Derive the API origin so CSP allows the deployed backend.
// Falls back to localhost for local dev.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
let apiOrigin = 'http://localhost:3001';
try {
  apiOrigin = new URL(apiUrl).origin;
} catch {
  // keep the localhost fallback
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'cdn.dummyjson.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // unsafe-eval is required by:
              //   - webpack HMR in dev
              //   - AJV schema compilation at runtime in widget validators (prod)
              // TODO(v2): pre-compile AJV schemas via ajv-cli to remove the prod
              // unsafe-eval dependency.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://placehold.co https://cdn.dummyjson.com",
              `connect-src 'self' ${apiOrigin}`,
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps in production CI (SENTRY_AUTH_TOKEN must be set)
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
