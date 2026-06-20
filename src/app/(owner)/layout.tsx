import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] w-full bg-background selection:bg-primary-container selection:text-white">
      {/* Sidebar untuk Desktop (hidden di mobile) */}
      <div className="hidden md:block w-[240px] flex-shrink-0">
        <Sidebar />
      </div>

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto pb-24">
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
  );
}
