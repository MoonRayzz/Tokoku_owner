'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import { PwaInstallButton } from '../pwa/PwaInstallButton';

function MobileStatusDot() {
  const supabase = createClient();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const { data } = await supabase
        .from('StoreStatus')
        .select('lastPing')
        .eq('id', 'local-store')
        .single();
      
      if (data && data.lastPing) {
        const pingTime = new Date(data.lastPing).getTime();
        const now = Date.now();
        setIsOnline(now - pingTime <= 45000);
      } else {
        setIsOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [supabase]);

  if (isOnline) {
    return <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse shadow-md ml-2" title="Online"></div>;
  }
  return <div className="w-2 h-2 rounded-full bg-danger ml-2" title="Offline"></div>;
}

export default function TopBar() {
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();
  const [logoUrl, setLogoUrl] = useState('');
  const [storeName, setStoreName] = useState('TokoKu');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await supabase.from('StoreProfile').select('logoUrl, name').eq('id', 'local-store').single();
        if (data) {
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.name) setStoreName(data.name);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchProfile();
  }, [supabase]);

  return (
    <div className="md:hidden sticky top-0 w-full z-40 flex flex-col shadow-sm">
      <header className="flex items-center justify-between p-4 border-b border-border bg-surface relative z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md overflow-hidden bg-primary-container flex items-center justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
            ) : (
              <Logo className="p-1 w-full h-full object-cover" />
            )}
          </div>
          <span className="font-bold text-text-primary">{storeName}</span>
          <MobileStatusDot />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-text-secondary hover:text-text-primary p-1"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full h-[calc(100dvh-65px)] bg-background flex flex-col p-4 border-b border-border z-10 overflow-y-auto">
          <nav className="flex flex-col gap-2">
            <Link href="/dashboard" onClick={() => setIsOpen(false)} className="px-4 py-3 rounded-lg bg-surface text-text-primary font-medium border border-border">Beranda</Link>
            <Link href="/laporan" onClick={() => setIsOpen(false)} className="px-4 py-3 rounded-lg bg-surface text-text-primary font-medium border border-border">Laporan Penjualan</Link>
            <Link href="/laporan/void" onClick={() => setIsOpen(false)} className="px-4 py-3 rounded-lg bg-surface text-text-primary font-medium border border-border">Audit Void</Link>
            <Link href="/produk" onClick={() => setIsOpen(false)} className="px-4 py-3 rounded-lg bg-surface text-text-primary font-medium border border-border">Produk</Link>
            <Link href="/pengeluaran" onClick={() => setIsOpen(false)} className="px-4 py-3 rounded-lg bg-surface text-text-primary font-medium border border-border">Pengeluaran</Link>
            <Link href="/member" onClick={() => setIsOpen(false)} className="px-4 py-3 rounded-lg bg-surface text-text-primary font-medium border border-border">Pelanggan</Link>
            <Link href="/absensi" onClick={() => setIsOpen(false)} className="px-4 py-3 rounded-lg bg-surface text-text-primary font-medium border border-border">Absensi</Link>
            <Link href="/pengaturan" onClick={() => setIsOpen(false)} className="px-4 py-3 rounded-lg bg-surface text-text-primary font-medium border border-border">Pengaturan</Link>
            <PwaInstallButton isMobile={true} />
          </nav>
        </div>
      )}
    </div>
  );
}
