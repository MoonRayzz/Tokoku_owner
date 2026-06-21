import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

// Ikon default sebagai fallback jika logo belum diset Owner
const DEFAULT_ICON_URL = '/icons/icon-default-192.png'
const DEFAULT_ICON_512_URL = '/icons/icon-default-512.png'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let storeName = 'TokoKu Owner'
  let logoUrl: string | null = null

  try {
    const settings = await prisma.storeProfile.findFirst({
      where: { id: 'local-store' }
    })
    if (settings) {
      storeName = settings.name || 'TokoKu Owner'
      logoUrl = settings.logoUrl || null
    }
  } catch {
    // Jika DB tidak bisa diakses, gunakan default
  }

  const iconUrl = logoUrl && isValidUrl(logoUrl) ? logoUrl : DEFAULT_ICON_URL
  const icon512Url = logoUrl && isValidUrl(logoUrl) ? logoUrl : DEFAULT_ICON_512_URL

  return {
    name: `${storeName} — Dashboard`,
    short_name: storeName,
    description: `Dashboard manajemen toko ${storeName}`,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f0f0f',
    theme_color: '#10b981',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon512Url,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon512Url,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [],
    categories: ['business', 'productivity'],
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}