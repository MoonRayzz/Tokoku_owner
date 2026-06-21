'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LogOut,
} from 'lucide-react';
import { ownerNavItems } from '@/config/navigation';
import Logo from '../ui/Logo';
import { createClient } from '@/app/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { PwaInstallButton } from '../pwa/PwaInstallButton';

function StoreStatusIndicator() {
  const supabase = createClient();
  const [isOnline, setIsOnline] = React.useState(false);

  React.useEffect(() => {
    const checkStatus = async () => {
      const { data } = await supabase
        .from('StoreStatus')
        .select('lastPing')
        .eq('id', 'local-store')
        .single();
      
      if (data && data.lastPing) {
        // Appending 'Z' because Prisma stores DateTime without timezone in Postgres
        // which strips the 'Z'. We know it's UTC because we send it via toISOString()
        const pingTime = new Date(data.lastPing + (data.lastPing.endsWith('Z') ? '' : 'Z')).getTime();
        const now = Date.now();
        // If ping was within the last 45 seconds, assume online
        setIsOnline(now - pingTime <= 45000);
      } else {
        setIsOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [supabase]);

  if (isOnline) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></div>
        <span className="text-[11px] font-semibold tracking-wider text-primary-container uppercase">
          Toko Lokal (Online)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-2 h-2 rounded-full bg-error"></div>
      <span className="text-[11px] font-semibold tracking-wider text-error uppercase">
        Toko Lokal (Offline)
      </span>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const [logoUrl, setLogoUrl] = useState('');
  const [storeName, setStoreName] = useState('TokoKu');

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await supabase.from('StoreProfile').select('name, logoUrl').eq('id', 'local-store').single();
        if (data) {
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.name) setStoreName(data.name);
        }
      } catch (err) {
        // ignore
      }
    }
    loadProfile();
  }, [supabase]);

  return (
    <aside className="w-full h-full border-r border-border bg-surface flex flex-col py-6 z-20">
      {/* Brand Logo */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-md overflow-hidden bg-primary-container flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
          ) : (
            <Logo className="p-1 w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 pr-2">
          <h1 className="text-xl font-bold text-text-primary leading-tight break-words whitespace-normal line-clamp-2">{storeName}</h1>
          <p className="text-xs text-text-secondary mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {ownerNavItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/laporan');
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 border-l-4 ${
                isActive 
                  ? 'bg-surface-container-highest text-primary border-primary' 
                  : 'text-text-secondary hover:bg-surface-container-high hover:text-text-primary border-transparent'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
        <div className="pt-2">
          <PwaInstallButton />
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="px-6 pt-6 border-t border-border mt-auto">
        <StoreStatusIndicator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-border flex items-center justify-center text-text-primary font-bold text-xs">
              OW
            </div>
            <span className="text-sm font-semibold text-text-primary">Owner</span>
          </div>
          <button 
            onClick={handleLogout}
            title="Keluar"
            className="text-text-secondary hover:text-error transition-colors p-1"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}
