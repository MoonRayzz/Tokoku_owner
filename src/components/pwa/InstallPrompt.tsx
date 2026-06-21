'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const result = await installEvent.userChoice
    if (result.outcome === 'accepted') {
      setInstallEvent(null)
    }
  }

  const handleDismiss = () => {
    setInstallEvent(null)
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!installEvent || isDismissed) return null

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border shadow-2xl backdrop-blur-sm">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary">Install TokoKu Owner</p>
        <p className="text-xs text-text-secondary mt-0.5">
          Akses lebih cepat dari homescreen
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold shrink-0 hover:brightness-110"
      >
        <Download size={14} />
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  )
}
