'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { revalidateManifest } from '../actions';

interface PengaturanClientProps {
  initialEmail: string;
}

export default function PengaturanClient({ initialEmail }: PengaturanClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const { success, error: toastError, warning } = useToast();
  const { confirm } = useConfirm();
  
  // Store Profile State
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [storeFooter, setStoreFooter] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [storeLatitude, setStoreLatitude] = useState('');
  const [storeLongitude, setStoreLongitude] = useState('');
  const [storeRadius, setStoreRadius] = useState(50);
  const [voidPin, setVoidPin] = useState('123456');
  const [debtEnabled, setDebtEnabled] = useState(false);
  const [debtLimitPerPerson, setDebtLimitPerPerson] = useState(0);
  const [debtLimitBehavior, setDebtLimitBehavior] = useState('WARN');
  const [isSavingStore, setIsSavingStore] = useState(false);

  // Status State
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Security State
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingAuth, setIsUpdatingAuth] = useState(false);

  useEffect(() => {
    async function loadStoreProfile() {
      const { data } = await supabase.from('StoreProfile').select('*').eq('id', 'local-store').single();
      if (data) {
        setStoreName(data.name || '');
        setStoreAddress(data.address || '');
        setStorePhone(data.phone || '');
        setStoreCity(data.city || '');
        setStoreFooter(data.footer || '');
        setLogoUrl(data.logoUrl || '');
        setStoreLatitude(data.latitude !== null ? String(data.latitude) : '');
        setStoreLongitude(data.longitude !== null ? String(data.longitude) : '');
        setStoreRadius(data.radius || 50);
        setVoidPin(data.voidPin || '123456');
        setDebtEnabled(data.debtEnabled || false);
        setDebtLimitPerPerson(data.debtLimitPerPerson || 0);
        setDebtLimitBehavior(data.debtLimitBehavior || 'WARN');
      }
    }
    
    async function checkStatus() {
      const { data: statusData, error } = await supabase.from('StoreStatus').select('lastPing').eq('id', 'local-store').single();
      if (error) {
        console.error("Supabase Error fetch status:", error);
      }
      if (statusData && statusData.lastPing) {
        const lpStr = statusData.lastPing + (statusData.lastPing.endsWith('Z') ? '' : 'Z');
        const lp = new Date(lpStr);
        setLastPing(lp);
        console.log("Fetched lastPing:", lp.toISOString(), "currentTime:", new Date(Date.now()).toISOString());
      }
    }

    loadStoreProfile();
    checkStatus();

    const timer = setInterval(() => {
      setCurrentTime(Date.now());
      checkStatus(); // Poll every 5s
    }, 5000);
    return () => clearInterval(timer);
  }, [supabase]);

  const isOnline = lastPing ? (currentTime - lastPing.getTime()) < 45000 : false;

  const handleSaveStore = async () => {
    setIsSavingStore(true);
    try {
      const { error } = await supabase.from('StoreProfile').upsert({
        id: 'local-store',
        name: storeName,
        address: storeAddress,
        phone: storePhone,
        city: storeCity,
        footer: storeFooter,
        logoUrl: logoUrl || null,
        latitude: storeLatitude ? parseFloat(storeLatitude) : null,
        longitude: storeLongitude ? parseFloat(storeLongitude) : null,
        radius: storeRadius,
        voidPin: voidPin,
        debtEnabled: debtEnabled,
        debtLimitPerPerson: debtLimitPerPerson,
        debtLimitBehavior: debtLimitBehavior,
        updatedAt: new Date().toISOString()
      });
      if (error) throw error;
      await revalidateManifest();
      success('Profil toko berhasil disimpan!');
    } catch (err: any) {
      toastError('Gagal menyimpan profil toko: ' + err.message);
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toastError("Browser Anda tidak mendukung deteksi lokasi");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStoreLatitude(String(pos.coords.latitude));
        setStoreLongitude(String(pos.coords.longitude));
        success("Lokasi toko berhasil didapatkan!");
      },
      (err) => {
        toastError("Gagal mendapatkan lokasi: pastikan izin lokasi diberikan.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleUpdateAuth = async () => {
    if (password && password !== confirmPassword) {
      warning('Kata sandi baru dan konfirmasi tidak cocok!');
      return;
    }
    
    setIsUpdatingAuth(true);
    try {
      const updates: any = {};
      if (email !== initialEmail) updates.email = email;
      if (password) updates.password = password;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.auth.updateUser(updates);
        if (error) throw error;
        success('Kredensial berhasil diperbarui!');
        setPassword('');
        setConfirmPassword('');
      } else {
        warning('Tidak ada perubahan untuk disimpan.');
      }
    } catch (err: any) {
      toastError('Gagal memperbarui: ' + err.message);
    } finally {
      setIsUpdatingAuth(false);
    }
  };

  const handleLogoutAll = async () => {
    const isConfirmed = await confirm({
      title: 'Keluar dari Semua Perangkat',
      message: 'Apakah Anda yakin ingin keluar dari semua perangkat?',
      confirmLabel: 'Ya, Keluar Semua',
      variant: 'warning'
    });
    
    if (isConfirmed) {
      await supabase.auth.signOut({ scope: 'global' });
      router.push('/login');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 h-full bg-background pb-20 md:pb-0">
      <div className="max-w-[1000px] mx-auto space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-primary-container mb-1">Status & Pengaturan</h1>
          <p className="text-sm text-text-secondary">Kelola preferensi toko dan pantau status koneksi Kasir Lokal.</p>
        </div>

        {/* Panel Status Sistem */}
        <section className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4 border-b border-border pb-2">Status Kasir Lokal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="flex items-center space-x-4 bg-surface-container p-4 rounded border border-border">
              <div className="relative flex items-center justify-center w-12 h-12">
                <div className={`absolute inset-0 rounded-full opacity-20 scale-150 ${isOnline ? 'bg-primary-container animate-pulse' : 'bg-danger'}`}></div>
                <div className={`relative w-4 h-4 rounded-full shadow-lg ${isOnline ? 'bg-primary-container' : 'bg-danger'}`}></div>
              </div>
              <div>
                <div className={`text-lg font-bold tracking-wide ${isOnline ? 'text-primary-container' : 'text-danger'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  {isOnline ? 'Aplikasi lokal aktif dan tersambung' : 'Aplikasi lokal terputus / dimatikan'}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-3 bg-surface-container p-4 rounded border border-border">
              <div className="flex items-center text-text-primary text-sm">
                <span className={`mr-2 font-bold ${isOnline ? 'text-primary-container' : 'text-danger'}`}>
                  {isOnline ? '✓ Sinkronisasi Real-time Aktif' : '⚠ Sinkronisasi Terhenti'}
                </span>
              </div>
              <div className="text-xs text-text-secondary">
                Sistem menarik pembaruan (seperti harga/stok baru) setiap 15 detik saat Online.
              </div>
            </div>
          </div>
        </section>

        {/* Panel Pengaturan & Preview Struk */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 bg-surface border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold text-text-primary mb-4 border-b border-border pb-2">
              Detail Toko & Struk
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Nama Toko</label>
                <input name="name" value={storeName} onChange={e => setStoreName(e.target.value)} type="text" className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] focus:border-primary-container" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Alamat Lengkap</label>
                <textarea name="address" value={storeAddress} onChange={e => setStoreAddress(e.target.value)} rows={2} className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none resize-none focus:border-primary-container"></textarea>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Nomor Telepon</label>
                <input name="phone" value={storePhone} onChange={e => setStorePhone(e.target.value)} type="text" className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] focus:border-primary-container" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Kota</label>
                <input name="city" value={storeCity} onChange={e => setStoreCity(e.target.value)} type="text" className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] focus:border-primary-container" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">URL Logo (Opsional)</label>
                <input name="logoUrl" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} type="text" placeholder="https://example.com/logo.png" className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] focus:border-primary-container" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Pesan Penutup (Footer)</label>
                <textarea name="footer" value={storeFooter} onChange={e => setStoreFooter(e.target.value)} rows={3} className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none resize-none focus:border-primary-container"></textarea>
              </div>
              
              <div className="pt-4 border-t border-border mt-2 space-y-4">
                <h3 className="text-sm font-bold text-text-primary">📍 Geofencing Absensi</h3>
                <p className="text-xs text-text-secondary">Atur lokasi toko agar karyawan hanya bisa absen di area toko.</p>
                
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm text-text-secondary mb-1">Latitude</label>
                    <input name="latitude" value={storeLatitude} onChange={e => setStoreLatitude(e.target.value)} type="text" placeholder="-6.200000" className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] focus:border-primary-container" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-text-secondary mb-1">Longitude</label>
                    <input name="longitude" value={storeLongitude} onChange={e => setStoreLongitude(e.target.value)} type="text" placeholder="106.816666" className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] focus:border-primary-container" />
                  </div>
                  <button onClick={handleGetLocation} className="bg-surface-container-highest hover:bg-border text-text-primary px-4 py-2 min-h-[44px] rounded text-sm font-semibold transition-all">
                    Dapatkan Lokasi
                  </button>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Radius Toleransi (Meter)</label>
                  <input name="radius" value={storeRadius} onChange={e => setStoreRadius(parseInt(e.target.value) || 0)} type="number" className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] focus:border-primary-container" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-border mt-2 space-y-4">
                <h3 className="text-sm font-bold text-text-primary">🛡️ Keamanan Toko Lokal</h3>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">PIN Void Transaksi (Kasir)</label>
                  <input name="voidPin" value={voidPin} onChange={e => setVoidPin(e.target.value)} type="password" maxLength={6} placeholder="123456" className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] tracking-widest focus:border-primary-container" />
                  <p className="text-xs text-text-secondary mt-1">Gunakan PIN ini untuk membatalkan nota dari kasir lokal.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-2 space-y-4">
                <h3 className="text-sm font-bold text-text-primary">💳 Kebijakan Utang (Kasbon)</h3>
                
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="debtEnabled"
                    checked={debtEnabled}
                    onChange={(e) => setDebtEnabled(e.target.checked)}
                    className="w-5 h-5 text-primary-container rounded border-border focus:ring-primary-container"
                  />
                  <div>
                    <label htmlFor="debtEnabled" className="block text-sm font-bold text-text-primary">Aktifkan Fitur Utang</label>
                    <p className="text-xs text-text-secondary">Izinkan kasir memproses transaksi menggunakan kasbon/utang.</p>
                  </div>
                </div>

                {debtEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-surface-container-low p-4 rounded-lg border border-border">
                    <div>
                      <label className="block text-sm font-bold text-text-primary mb-1">Batas Maksimal Utang per Orang</label>
                      <input 
                        type="number" 
                        value={debtLimitPerPerson} 
                        onChange={(e) => setDebtLimitPerPerson(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none focus:border-primary-container"
                        min="0"
                      />
                      <p className="text-xs text-text-secondary mt-1">Isi 0 untuk tanpa batas.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-text-primary mb-1">Jika Batas Terlampaui</label>
                      <select 
                        value={debtLimitBehavior}
                        onChange={(e) => setDebtLimitBehavior(e.target.value)}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none focus:border-primary-container"
                      >
                        <option value="WARN">Hanya Beri Peringatan (Kasir bisa lanjut)</option>
                        <option value="BLOCK">Blokir Transaksi (Tidak bisa utang)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-border mt-2">
                <button onClick={handleSaveStore} disabled={isSavingStore} className="w-full bg-primary-container text-[#000000] font-bold rounded px-4 py-2 min-h-[44px] hover:brightness-110 transition-all disabled:opacity-50">
                  {isSavingStore ? 'MENYIMPAN...' : 'SIMPAN PENGATURAN'}
                </button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-2 bg-surface border border-border rounded-lg p-6 flex flex-col">
            <h2 className="text-lg font-bold text-text-primary mb-4 border-b border-border pb-2">
              Pratinjau Kertas
            </h2>
            <div className="flex-1 flex items-center justify-center bg-background rounded border border-border p-4 overflow-hidden">
              <div className="thermal-receipt bg-white text-black font-mono w-full max-w-[280px] text-[12px] leading-tight flex flex-col items-center p-4 transform rotate-1 shadow-xl">
                <div className="text-center mb-2 w-full">
                  {logoUrl && (
                    <div className="flex justify-center mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Logo" className="h-8 object-contain mix-blend-multiply grayscale" />
                    </div>
                  )}
                  <div className="font-bold text-[16px] mb-1">{storeName || 'TOKOKU POS'}</div>
                  <div className="break-words">{storeAddress || 'Alamat Toko'}</div>
                  <div>{storeCity}</div>
                  <div>Telp: {storePhone || '-'}</div>
                </div>
                <div className="my-2 border-b border-dashed border-black w-full"></div>
                <div className="flex justify-between mb-1 w-full text-xs"><span>Kasir: Admin</span><span>14:30</span></div>
                <div className="my-2 border-b border-dashed border-black w-full"></div>
                
                <div className="flex justify-between mb-1 w-full"><span className="truncate">Kopi Susu</span><span>15.000</span></div>
                <div className="flex justify-between mb-1 w-full"><span className="truncate">Roti Bakar</span><span>20.000</span></div>
                
                <div className="my-2 border-b border-dashed border-black w-full"></div>
                <div className="flex justify-between font-bold text-[14px] w-full"><span>TOTAL</span><span>Rp 35.000</span></div>
                <div className="my-2 border-b border-dashed border-black w-full"></div>
                
                <div className="w-full space-y-1">
                  <div className="flex justify-between w-full"><span>Metode Bayar</span><span>CASH</span></div>
                  <div className="flex justify-between w-full"><span>Uang Diterima</span><span>Rp 40.000</span></div>
                  <div className="flex justify-between w-full"><span>Kembalian</span><span>Rp 5.000</span></div>
                </div>

                <div className="my-2 border-b border-dashed border-black w-full"></div>
                <div className="text-center mt-2 mb-2 whitespace-pre-wrap break-words italic text-xs w-full">
                  {storeFooter || 'Terima kasih atas kunjungan Anda!'}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Keamanan Akun */}
        <section className="bg-surface border border-border rounded-lg p-6 mt-6">
          <div className="flex items-center gap-3 mb-4 border-b border-border pb-2">
            <div className="text-primary-container">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Keamanan Akun</h3>
              <p className="text-sm text-text-secondary">Kelola akses dan kata sandi akun dashboard Anda</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Ubah Email Login</label>
              <input 
                type="email"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] focus:border-primary-container" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Kata Sandi Baru</label>
                <input 
                  type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] focus:border-primary-container" 
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Konfirmasi Kata Sandi Baru</label>
                <input 
                  type="password" placeholder="••••••••"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:outline-none min-h-[44px] focus:border-primary-container" 
                />
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleUpdateAuth}
                disabled={isUpdatingAuth}
                className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded font-bold transition-all hover:brightness-110 disabled:opacity-50"
              >
                {isUpdatingAuth ? 'Memperbarui...' : 'Perbarui Kredensial'}
              </button>
            </div>
          </div>
        </section>

        {/* Zona Berbahaya */}
        <section className="bg-surface border border-error/30 rounded-lg p-6 mt-6">
          <div className="flex items-center gap-3 mb-4 border-b border-border pb-2">
            <div className="text-danger">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-danger">Zona Berbahaya</h3>
              <p className="text-sm text-text-secondary">Tindakan sensitif yang dapat mempengaruhi sesi aktif</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-text-primary">Keluar dari semua perangkat</h4>
              <p className="text-sm text-text-secondary mt-1">Ini akan mengakhiri semua sesi aktif TokoKu Dashboard Anda di komputer atau perangkat mobile lainnya.</p>
            </div>
            <button 
              onClick={handleLogoutAll}
              className="border border-danger text-danger hover:bg-danger/10 px-5 py-2.5 rounded font-bold transition-all"
            >
              Keluar Semua Sesi
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
