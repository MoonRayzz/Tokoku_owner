// src/app/manifest.ts
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TokoKu Owner Dashboard',
    short_name: 'TokoKu Owner',
    description: 'Dasbor manajemen pusat untuk operasional TokoKu POS.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0D1117',
    theme_color: '#10b981',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
  };
}