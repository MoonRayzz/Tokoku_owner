import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    navigateFallback: "/offline",
    navigateFallbackDenylist: [
      /^\/_next\//,
      /^\/api\//,
      /^\/login\//,
      /^\/absen\//,
      /supabase\.co/,
    ],
    runtimeCaching: [
      // HALAMAN APLIKASI — Stale While Revalidate
      {
        urlPattern: /^https:\/\/[^/]+\/(dashboard|laporan|pelanggan|absensi|pengeluaran|pengaturan)/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pages-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
        },
      },
      // GAMBAR & ASET STATIS — Cache First
      {
        urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
      // FONT — Cache First
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'fonts-cache',
          expiration: {
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
        },
      },
      // SUPABASE — Network Only
      {
        urlPattern: /supabase\.co/,
        handler: 'NetworkOnly',
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
