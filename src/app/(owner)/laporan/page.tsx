import React from 'react';
import { prisma } from '@/lib/db';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Download, 
  FileText, 
  Calendar, 
  Wallet, 
  ReceiptText, 
  Activity,
  Filter,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

// Helper: Menghitung persentase tren
function getTrend(current: number, previous: number) {
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const startParam = typeof resolvedParams.start === 'string' ? resolvedParams.start : '';
  const endParam = typeof resolvedParams.end === 'string' ? resolvedParams.end : '';
  const shiftParam = typeof resolvedParams.shift === 'string' ? resolvedParams.shift : '';
  
  const pageParam = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const limit = 20;

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  
  // Parse date or default to today
  const startDate = startParam ? new Date(`${startParam}T00:00:00`) : startOfDay(now);
  const endDate = endParam ? new Date(`${endParam}T23:59:59`) : endOfDay(now);

  // Ambil daftar shift untuk filter
  const shifts = await prisma.shift.findMany({ where: { isActive: true } });

  const whereClause = {
    createdAt: { gte: startDate, lte: endDate },
    isVoid: false,
    ...(shiftParam ? { shiftId: shiftParam } : {})
  };

  // Optimasi: Hitung total menggunakan aggregate, bukan fetch semua data (Meringankan memori)
  const aggregate = await prisma.transaction.aggregate({
    where: whereClause,
    _sum: { totalAmount: true },
    _count: { id: true }
  });

  const totalSales = aggregate._sum.totalAmount || 0;
  const totalCount = aggregate._count.id;
  
  // Total Pengeluaran
  const expenseAggregate = await prisma.expense.aggregate({
    where: {
      date: { gte: startDate, lte: endDate },
      ...(shiftParam ? { shiftId: shiftParam } : {})
    },
    _sum: { amount: true }
  });
  const totalExpense = expenseAggregate._sum.amount || 0;

  // Laba Bersih
  // Harus ambil details untuk hitung HPP
  const allTxForProfit = await prisma.transaction.findMany({
    where: whereClause,
    include: { details: true }
  });
  const totalHpp = allTxForProfit.reduce((sum, tx) => {
    return sum + tx.details.reduce((ds, d) => ds + ((d.priceBuyAtTime || 0) * d.quantity), 0);
  }, 0);

  const netProfit = totalSales - totalHpp - totalExpense;

  // Nilai Inventori (Modal Mengendap)
  const allProducts = await prisma.product.findMany({ select: { stock: true, priceBuy: true } });
  const totalInventoryValue = allProducts.reduce((sum, p) => sum + (p.stock * (p.priceBuy || 0)), 0);
  
  // Data transaksi untuk tabel (di-paginate)
  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    include: {
      member: true,
      details: { include: { product: true } }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const totalPages = Math.ceil(totalCount / limit);
  
  // Durasi hari untuk rata-rata (minimal 1)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  const avgDaily = totalSales / diffDays;

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
      {/* Page Header */}
      <section>
        <h2 className="text-2xl font-bold text-text-primary">Laporan Penjualan</h2>
        <p className="text-sm text-text-secondary mt-1">Analisis dan ekspor data transaksi toko Anda</p>
      </section>

      {/* Filter & Export Bar */}
      <section className="bg-surface border border-border rounded-xl p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {/* Quick Filters - Di MVP bisa pakai Link untuk merubah query param */}
          <Link 
            href={`/laporan?start=${todayStr}&end=${todayStr}`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${(!startParam || startParam === todayStr) ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-variant hover:text-text-primary border border-transparent'}`}
          >
            Hari Ini
          </Link>
          <Link 
            href={`/laporan?start=${format(subDays(now, 7), 'yyyy-MM-dd')}&end=${todayStr}`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${startParam === format(subDays(now, 7), 'yyyy-MM-dd') ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-variant hover:text-text-primary border border-transparent'}`}
          >
            7 Hari Terakhir
          </Link>
          <Link 
            href={`/laporan?start=${format(subDays(now, 30), 'yyyy-MM-dd')}&end=${todayStr}`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${startParam === format(subDays(now, 30), 'yyyy-MM-dd') ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-variant hover:text-text-primary border border-transparent'}`}
          >
            30 Hari Terakhir
          </Link>
          <div className="flex bg-surface border border-border rounded-lg px-2 items-center h-9 shadow-sm ml-2">
            <span className="material-symbols-outlined text-text-secondary text-[16px] mr-2">schedule</span>
            <div className="flex gap-1">
              <Link 
                href={`/laporan?start=${startParam || todayStr}&end=${endParam || todayStr}`}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${!shiftParam ? 'bg-primary/20 text-primary font-bold' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Semua Shift
              </Link>
              {shifts.map(s => (
                <Link 
                  key={s.id}
                  href={`/laporan?start=${startParam || todayStr}&end=${endParam || todayStr}&shift=${s.id}`}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${shiftParam === s.id ? 'bg-primary/20 text-primary font-bold' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <a 
            href={`/api/export/laporan?type=excel&start=${startParam || todayStr}&end=${endParam || todayStr}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            <Download size={18} /> Unduh Excel
          </a>
          <a 
            href={`/api/export/laporan?type=pdf&start=${startParam || todayStr}&end=${endParam || todayStr}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors"
          >
            <FileText size={18} /> Unduh PDF
          </a>
        </div>
      </section>

      {/* Summary Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col relative overflow-hidden group hover:border-border-muted transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-xs text-text-secondary mb-2 flex items-center gap-1.5 uppercase font-semibold">
            <Wallet size={16} /> Total Omzet
          </p>
          <h3 className="text-xl text-text-primary font-bold">Rp {totalSales.toLocaleString('id-ID')}</h3>
        </div>
        
        {/* Metric 2 */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col relative overflow-hidden group hover:border-border-muted transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-error/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-xs text-text-secondary mb-2 flex items-center gap-1.5 uppercase font-semibold">
            <Wallet size={16} className="text-error" /> Total Pengeluaran
          </p>
          <h3 className="text-xl text-error font-bold">Rp {totalExpense.toLocaleString('id-ID')}</h3>
        </div>
        
        {/* Metric 3 */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col relative overflow-hidden group hover:border-border-muted transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-xs text-text-secondary mb-2 flex items-center gap-1.5 uppercase font-semibold">
            <TrendingUp size={16} className="text-primary" /> Laba Bersih
          </p>
          <h3 className="text-xl text-primary font-bold">Rp {netProfit.toLocaleString('id-ID')}</h3>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col relative overflow-hidden group hover:border-border-muted transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-xs text-text-secondary mb-2 flex items-center gap-1.5 uppercase font-semibold">
            <ReceiptText size={16} /> Total Transaksi
          </p>
          <h3 className="text-xl text-text-primary font-bold">{totalCount}</h3>
        </div>

        {/* Metric 5 */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col relative overflow-hidden group hover:border-border-muted transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-xs text-text-secondary mb-2 flex items-center gap-1.5 uppercase font-semibold">
            <Activity size={16} /> Rata-rata Harian
          </p>
          <h3 className="text-xl text-text-primary font-bold">Rp {Math.round(avgDaily).toLocaleString('id-ID')}</h3>
        </div>

        {/* Metric 6 (Nilai Inventori) */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col relative overflow-hidden group hover:border-border-muted transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-xs text-text-secondary mb-2 flex items-center gap-1.5 uppercase font-semibold text-warning">
            <Activity size={16} /> Nilai Inventori
          </p>
          <h3 className="text-xl text-warning font-bold">Rp {totalInventoryValue.toLocaleString('id-ID')}</h3>
        </div>
      </section>

      {/* Data Table Section */}
      <section className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
          <h3 className="text-lg font-semibold text-text-primary">Riwayat Transaksi</h3>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-text-secondary hover:text-primary transition-colors border border-border">
              <Filter size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-surface-variant z-10 px-6 py-3 text-[11px] text-text-secondary font-semibold uppercase tracking-wider border-b border-border">Waktu</th>
                <th className="sticky top-0 bg-surface-variant z-10 px-6 py-3 text-[11px] text-text-secondary font-semibold uppercase tracking-wider border-b border-border">No. Nota</th>
                <th className="sticky top-0 bg-surface-variant z-10 px-6 py-3 text-[11px] text-text-secondary font-semibold uppercase tracking-wider border-b border-border">Kasir (Shift)</th>
                <th className="sticky top-0 bg-surface-variant z-10 px-6 py-3 text-[11px] text-text-secondary font-semibold uppercase tracking-wider border-b border-border">Pelanggan</th>
                <th className="sticky top-0 bg-surface-variant z-10 px-6 py-3 text-[11px] text-text-secondary font-semibold uppercase tracking-wider border-b border-border text-right">Omzet</th>
                <th className="sticky top-0 bg-surface-variant z-10 px-6 py-3 text-[11px] text-text-secondary font-semibold uppercase tracking-wider border-b border-border text-right">Modal (HPP)</th>
                <th className="sticky top-0 bg-surface-variant z-10 px-6 py-3 text-[11px] text-text-secondary font-semibold uppercase tracking-wider border-b border-border text-right">Profit Kotor</th>
                <th className="sticky top-0 bg-surface-variant z-10 px-6 py-3 text-[11px] text-text-secondary font-semibold uppercase tracking-wider border-b border-border text-center">Margin %</th>
                <th className="sticky top-0 bg-surface-variant z-10 px-6 py-3 text-[11px] text-text-secondary font-semibold uppercase tracking-wider border-b border-border text-center">Metode Bayar</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">Tidak ada transaksi pada periode ini.</td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const itemsSummary = tx.details.map(d => `${d.product.name} (${d.quantity})`).join(', ');
                  const shiftName = shifts.find(s => s.id === tx.shiftId)?.name || 'Unknown';
                  
                  let totalModal = 0;
                  tx.details.forEach(d => {
                    totalModal += (d.priceBuyAtTime || 0) * d.quantity;
                  });
                  const profitKotor = tx.totalAmount - totalModal;
                  const marginPercent = tx.totalAmount > 0 ? (profitKotor / tx.totalAmount) * 100 : 0;

                  return (
                    <tr key={tx.id} className="bg-surface hover:bg-surface-container transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-text-secondary font-medium">{format(tx.createdAt, 'HH:mm', { locale: id })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-primary cursor-pointer group-hover:underline font-medium">{tx.receiptNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-text-primary">
                        <div className="flex flex-col">
                          <span className="font-semibold">{tx.cashierName}</span>
                          <span className="text-[10px] text-text-secondary">{shiftName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-text-primary">{tx.member?.name || 'Umum'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-text-primary font-bold text-right">Rp {tx.totalAmount.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-text-secondary text-right">Rp {totalModal.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-primary-container font-bold text-right">Rp {profitKotor.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-text-primary text-center">
                        {totalModal > 0 ? `${marginPercent.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          tx.paymentMethod.toLowerCase() === 'cash' || tx.paymentMethod.toLowerCase() === 'tunai'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-surface-bright text-text-primary border-border'
                        }`}>
                          {tx.paymentMethod.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-surface">
            <span className="text-sm text-text-secondary font-medium">
              Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} dari {totalCount} transaksi
            </span>
            <div className="flex gap-2">
              <Link 
                href={`/laporan?start=${startParam}&end=${endParam}&shift=${shiftParam}&page=${page > 1 ? page - 1 : 1}`}
                className={`px-3 py-1.5 rounded border text-sm transition-colors flex items-center ${page <= 1 ? 'border-border/50 text-text-secondary/50 pointer-events-none' : 'border-border text-text-primary hover:bg-surface-container'}`}
              >
                Sebelumnya
              </Link>
              
              <div className="px-3 py-1.5 rounded bg-surface-container text-text-primary text-sm font-semibold border border-border">
                {page} / {totalPages}
              </div>

              <Link 
                href={`/laporan?start=${startParam}&end=${endParam}&shift=${shiftParam}&page=${page < totalPages ? page + 1 : totalPages}`}
                className={`px-3 py-1.5 rounded border text-sm transition-colors flex items-center ${page >= totalPages ? 'border-border/50 text-text-secondary/50 pointer-events-none' : 'border-border text-text-primary hover:bg-surface-container'}`}
              >
                Selanjutnya
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
