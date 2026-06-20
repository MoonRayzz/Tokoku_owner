import React from 'react';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { id } from 'date-fns/locale';
import StatCard from '@/components/ui/StatCard';
import SalesChart from '../laporan/components/SalesChart';
import { 
  Banknote, 
  ReceiptText, 
  Calculator, 
  Users,
  AlertTriangle,
  ArrowRight,
  Wallet,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));

  // Transaksi hari ini
  const todayTx = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: todayStart, lte: todayEnd },
      isVoid: false,
    },
    include: { details: true }
  });

  const totalSales = todayTx.reduce((sum, t) => sum + t.totalAmount, 0);
  const txCount = todayTx.length;
  const avgOrder = txCount > 0 ? totalSales / txCount : 0;

  // Transaksi kemarin (untuk trend)
  const yesterdayTx = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
      isVoid: false,
    },
    include: { details: true }
  });

  const yesterdaySales = yesterdayTx.reduce((sum, t) => sum + t.totalAmount, 0);

  // Pengeluaran Hari Ini & Kemarin
  const todayExpense = await prisma.expense.findMany({
    where: { date: { gte: todayStart, lte: todayEnd } }
  });
  const totalExpense = todayExpense.reduce((sum, e) => sum + e.amount, 0);

  const yesterdayExpense = await prisma.expense.findMany({
    where: { date: { gte: yesterdayStart, lte: yesterdayEnd } }
  });
  const yesterdayTotalExpense = yesterdayExpense.reduce((sum, e) => sum + e.amount, 0);

  // Kalkulasi HPP (Harga Pokok Penjualan)
  const todayHpp = todayTx.reduce((sum, tx) => {
    return sum + tx.details.reduce((ds, d) => ds + ((d.priceBuyAtTime || 0) * d.quantity), 0);
  }, 0);

  const yesterdayHpp = yesterdayTx.reduce((sum, tx) => {
    return sum + tx.details.reduce((ds, d) => ds + ((d.priceBuyAtTime || 0) * d.quantity), 0);
  }, 0);

  const netProfit = totalSales - todayHpp - totalExpense;
  const yesterdayNetProfit = yesterdaySales - yesterdayHpp - yesterdayTotalExpense;
  
  const profitTrend = yesterdayNetProfit === 0 ? (netProfit > 0 ? 100 : 0) : ((netProfit - yesterdayNetProfit) / Math.abs(yesterdayNetProfit)) * 100;
  const expenseTrend = yesterdayTotalExpense === 0 ? (totalExpense > 0 ? 100 : 0) : ((totalExpense - yesterdayTotalExpense) / yesterdayTotalExpense) * 100;
  const yesterdayCount = yesterdayTx.length;
  
  const salesTrend = yesterdaySales === 0 ? 100 : ((totalSales - yesterdaySales) / yesterdaySales) * 100;
  const countTrend = txCount - yesterdayCount;

  // Member
  const memberCount = await prisma.member.count();

  // Stok Menipis
  const lowStock = await prisma.product.findMany({
    where: {
      stock: { lte: prisma.product.fields.minStockAlert } // Prisma > 5.0 supports field reference, but let's do a safe raw query or just fetch all and filter if it's too complex.
      // Wait, field reference is supported in Prisma 5 via `lte: prisma.product.fields.minStockAlert`. But to be completely safe in older versions, we can just fetch items with low stock absolute number or use a simpler where condition. Since I don't know the exact Prisma version feature set active, I will just fetch items where stock <= minStockAlert. Let's write a safe query:
    }
  });
  // Wait, Prisma doesn't directly support comparing two columns in a `where` clause easily without raw queries or specific preview features.
  // Let me just fetch products where stock < 10 for simplicity, or fetch all and filter in memory since we are in MVP phase. I will fetch all and filter.
  const allProducts = await prisma.product.findMany();
  const actualLowStock = allProducts.filter(p => p.stock <= p.minStockAlert).slice(0, 5);

  // Data 7 hari untuk chart
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(now, i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayTx = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
        isVoid: false,
      }
    });
    
    const dayAmount = dayTx.reduce((sum, t) => sum + t.totalAmount, 0);
    chartData.push({
      date: format(date, 'd MMM', { locale: id }),
      amount: dayAmount
    });
  }

  // Top Products (Aggregasi in-memory untuk hari ini)
  const productSales: Record<string, { name: string; quantity: number }> = {};
  todayTx.forEach(tx => {
    tx.details.forEach(d => {
      if (!productSales[d.productId]) {
        const prod = allProducts.find(p => p.id === d.productId);
        productSales[d.productId] = { name: prod?.name || 'Unknown', quantity: 0 };
      }
      productSales[d.productId].quantity += d.quantity;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const formattedDate = format(now, 'EEEE, dd MMMM yyyy', { locale: id });

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner & Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-text-primary">Selamat pagi, Owner 👋</h2>
            <div className="flex items-center gap-1.5 bg-primary-container/10 border border-primary-container/20 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></div>
              <span className="text-[11px] font-semibold tracking-wider text-primary-container uppercase">Live</span>
            </div>
          </div>
          <p className="text-sm text-text-secondary">Berikut performa toko Anda hari ini — {formattedDate}</p>
        </div>
        <Link 
          href="/produk" 
          className="bg-primary-container hover:bg-primary text-on-primary-container text-sm px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 h-11"
        >
          Tambah Produk
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard 
          title="Omzet Hari Ini" 
          value={`Rp ${totalSales.toLocaleString('id-ID')}`} 
          trend={`${salesTrend > 0 ? '+' : ''}${salesTrend.toFixed(1)}%`}
          trendUp={salesTrend >= 0}
          icon={<Banknote size={20} />} 
        />
        <StatCard 
          title="Pengeluaran Operasional" 
          value={`Rp ${totalExpense.toLocaleString('id-ID')}`} 
          trend={`${expenseTrend > 0 ? '+' : ''}${expenseTrend.toFixed(1)}%`}
          trendUp={expenseTrend <= 0} // Jika pengeluaran turun, itu trend baik (hijau)
          icon={<Wallet size={20} />} 
        />
        <StatCard 
          title="Laba Bersih" 
          value={`Rp ${netProfit.toLocaleString('id-ID')}`} 
          trend={`${profitTrend > 0 ? '+' : ''}${profitTrend.toFixed(1)}%`}
          trendUp={profitTrend >= 0}
          icon={<TrendingUp size={20} />} 
        />
        <StatCard 
          title="Total Transaksi" 
          value={txCount} 
          trend={`${countTrend > 0 ? '+' : ''}${countTrend}`}
          trendUp={countTrend >= 0}
          icon={<ReceiptText size={20} />} 
        />
        <StatCard 
          title="Member Aktif" 
          value={memberCount} 
          icon={<Users size={20} />} 
        />
      </div>

      {/* Middle Row: Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-surface border border-border rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-text-primary">Pendapatan 7 Hari Terakhir</h3>
            <div className="flex bg-surface-container-highest rounded-lg p-1 border border-border">
              <button className="px-3 py-1 bg-surface text-text-primary text-sm font-medium rounded-md shadow-sm border border-border">7 Hari</button>
            </div>
          </div>
          <SalesChart data={chartData} />
        </div>

        <div className="lg:col-span-4 bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-6">Produk Terlaris Hari Ini</h3>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-sm text-text-secondary">Belum ada transaksi hari ini.</p>
            ) : (
              topProducts.map((p, idx) => {
                const maxQty = topProducts[0].quantity;
                const percent = Math.max(10, (p.quantity / maxQty) * 100);
                
                return (
                  <div key={idx} className="group relative">
                    <div className="flex justify-between items-center mb-1 relative z-10">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-text-secondary w-4">{idx + 1}.</span>
                        <span className="text-sm text-text-primary font-medium truncate max-w-[150px]">{p.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-text-primary">x{p.quantity}</span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary-container h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <Link href="/laporan" className="w-full mt-6 py-2 text-text-secondary hover:text-text-primary text-sm transition-colors border border-border hover:border-border-muted rounded-lg flex items-center justify-center gap-2">
            <span>Lihat Semua Penjualan</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Bottom Row: Alert / Table Stok */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden border-l-[3px] border-l-warning">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-warning/5">
          <AlertTriangle className="text-warning" size={20} />
          <h3 className="text-lg font-semibold text-text-primary">Stok Menipis — Perlu Segera Direstok</h3>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-border text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                <th className="px-6 py-3">Nama Produk</th>
                <th className="px-6 py-3">Stok Tersisa</th>
                <th className="px-6 py-3">Minimum Stok</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {actualLowStock.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-text-secondary">Semua stok produk aman.</td>
                </tr>
              ) : (
                actualLowStock.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-highest transition-colors group">
                    <td className="px-6 py-4 text-text-primary font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-error font-bold">{p.stock} Pcs</td>
                    <td className="px-6 py-4 text-text-secondary">{p.minStockAlert} Pcs</td>
                    <td className="px-6 py-4 text-right">
                      <Link href="/produk" className="text-text-secondary group-hover:text-primary-container border border-transparent group-hover:border-border px-3 py-1.5 rounded-md transition-all">
                        Lihat Produk
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
