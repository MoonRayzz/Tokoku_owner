import { 
  LayoutDashboard, 
  BarChart2, 
  Box, 
  Users, 
  Settings, 
  CalendarCheck,
  Wallet,
  ShieldAlert,
  BookOpen
} from 'lucide-react';

export const ownerNavItems = [
  { name: 'Beranda', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Laporan Penjualan', href: '/laporan', icon: BarChart2 },
  { name: 'Audit Void', href: '/laporan/void', icon: ShieldAlert },
  { name: 'Produk', href: '/produk', icon: Box },
  { name: 'Buku Utang', href: '/buku-utang', icon: BookOpen },
  { name: 'Pengeluaran', href: '/pengeluaran', icon: Wallet },
  { name: 'Pelanggan', href: '/member', icon: Users },
  { name: 'Absensi', href: '/absensi', icon: CalendarCheck },
  { name: 'Pengaturan', href: '/pengaturan', icon: Settings },
];
