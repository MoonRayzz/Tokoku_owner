// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import { PwaRegistrar } from "@/components/features/PwaRegistrar";

const inter = Inter({ subsets: ["latin"] });

// PENTING: Pengaturan Viewport khusus untuk Mobile App / PWA
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Mencegah double-tap zoom di iOS
  userScalable: false, // Mengunci zoom agar terasa seperti aplikasi native
  themeColor: "#10b981", // Warna status bar di HP (sesuai tema emerald kita)
};

export const metadata: Metadata = {
  title: "TokoKu Owner Dashboard",
  description: "Manajemen pusat untuk operasional TokoKu POS.",
  manifest: "/manifest.json", // Mengarah ke manifest.ts yang otomatis di-compile Next.js
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TokoKu Owner",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
        
        {/* PWA iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TokoKu Owner" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* PWA General */}
        <meta name="mobile-web-app-capable" content="yes" />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.deferredInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', (e) => {
                // Prevent the mini-infobar from appearing on mobile
                e.preventDefault();
                // Stash the event so it can be triggered later.
                window.deferredInstallPrompt = e;
              });
            `,
          }}
        />
      </head>
      {/* Perbaikan Responsif:
        Menggunakan h-[100dvh] (Dynamic Viewport Height) alih-alih h-screen
        agar tidak terpotong oleh address bar mobile browser.
      */}
      <body className={`${inter.className} bg-background text-text-primary h-[100dvh] w-full overflow-hidden selection:bg-primary-container selection:text-on-primary-container`}>
        
        {/* Pendaftar Service Worker di latar belakang */}
        <PwaRegistrar />

        {/* Menyuntikkan Alat Tempur Global */}
        <ToastProvider>
          <ConfirmDialogProvider>
            
            {/* Tempat Sidebar & Halaman Utama Nanti */}
            {children}
            
          </ConfirmDialogProvider>
        </ToastProvider>

      </body>
    </html>
  );
}