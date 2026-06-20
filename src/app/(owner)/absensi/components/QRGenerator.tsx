'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';

export default function QRGenerator() {
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    // Determine the base URL for the QR code dynamically in the browser
    setAppUrl(window.location.origin);
  }, []);

  const absenUrl = `${appUrl}/absen`;

  return (
    <div className="bg-surface rounded-xl border border-border p-6 flex flex-col items-center gap-4 text-center print-only">
      <h3 className="font-bold text-lg text-text-primary">QR Code Absensi Pegawai</h3>
      
      {appUrl ? (
        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG value={absenUrl} size={200} />
        </div>
      ) : (
        <div className="w-[232px] h-[232px] bg-surface-container-high animate-pulse rounded-xl" />
      )}
      
      <div>
        <p className="text-[11px] font-semibold text-text-secondary mb-1">URL PORTAL ABSEN</p>
        <p className="text-sm font-medium text-primary-container break-all">{absenUrl}</p>
      </div>
      
      <p className="text-xs text-text-secondary max-w-xs">
        Print dan tempelkan QR ini di area toko. Karyawan dapat melakukan *scan* menggunakan HP mereka untuk melakukan Absen Masuk & Pulang.
      </p>
      
      <button
        onClick={() => window.print()}
        className="bg-primary-container hover:bg-primary text-on-primary-container px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all mt-2 print:hidden"
      >
        <Printer size={16} /> Print QR Code
      </button>
    </div>
  );
}
