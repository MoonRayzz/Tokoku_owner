'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export function PwaInstallButton({ className, isMobile = false }: { className?: string, isMobile?: boolean }) {
  const [installEvent, setInstallEvent] = useState<any>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };

    // Ambil event yang mungkin sudah tertangkap duluan oleh script di layout.tsx
    if (typeof window !== 'undefined' && (window as any).deferredInstallPrompt) {
      setInstallEvent((window as any).deferredInstallPrompt);
    }

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === 'accepted') {
      setInstallEvent(null);
    }
  };

  if (!installEvent) return null;

  return (
    <button
      onClick={handleInstall}
      className={
        isMobile 
          ? `flex items-center gap-2 px-4 py-3 rounded-lg bg-primary-container text-on-primary-container font-medium border border-border w-full text-left ${className || ''}`
          : `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 text-primary bg-primary-container/20 hover:bg-primary-container border border-transparent ${className || ''}`
      }
    >
      <Download size={20} />
      <span className="text-sm">Install Aplikasi</span>
    </button>
  );
}
