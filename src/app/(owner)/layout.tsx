import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InstallPrompt />
      <div className="flex flex-col h-[100dvh] w-full bg-background selection:bg-primary-container selection:text-white overflow-hidden">
        
        {/* Offline Banner ditempatkan di root flow sehingga mendorong konten ke bawah */}
        <OfflineBanner />
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar untuk Desktop (hidden di mobile) */}
          <div className="hidden md:flex w-[240px] flex-shrink-0">
            <Sidebar />
          </div>

          {/* Konten Utama */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-24 relative">
            {/* TopBar untuk Mobile (hidden di desktop) */}
            <TopBar />
            
            {/* Header Spacer Khusus Desktop (karena di desain ada sticky header transparan) */}
            <header className="hidden md:flex sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border px-8 py-6 h-12 items-center justify-between">
              <div className="w-full"></div>
            </header>
            
            <main className="flex-1 w-full relative">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
