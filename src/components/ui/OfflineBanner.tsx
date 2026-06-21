'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    setIsOffline(!navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/90 text-white text-sm backdrop-blur-sm shadow-md">
      <WifiOff size={16} />
      <span className="font-medium">Offline — Menampilkan data terakhir yang tersimpan</span>
    </div>
  )
}
