import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ─── Output ───────────────────────────────────────────
  // Produces a self-contained .next/standalone build for Docker / Azure.
  output: 'standalone',

  // ─── Performance ──────────────────────────────────────
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,

  // ─── Images ───────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Add your allowed image domains here
      // { protocol: 'https', hostname: 'example.com' },
    ],
  },

  // ─── Headers ──────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
