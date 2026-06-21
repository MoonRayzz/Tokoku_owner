import React from 'react';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
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
  TrendingUp,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { differenceInMinutes } from 'date-fns';

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));

  // Aggregasi untuk hari ini dan kemarin
  const [
    todayTxAgg,
    yesterdayTxAgg,
    todayExpenseAgg,
    yesterdayExpenseAgg,
    todayHppResult,
    yesterdayHppResult
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { createdAt: { gte: todayStart, lte: todayEnd }, isVoid: false },
      _sum: { totalAmount: true },
      _count: { id: true }
    }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd }, isVoid: false },
      _sum: { totalAmount: true },
      _count: { id: true }
    }),
    prisma.expense.aggregate({
      where: { date: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: { date: { gte: yesterdayStart, lte: yesterdayEnd } },
      _sum: { amount: true }
    }),
    prisma.$queryRaw<any[]>`SELECT SUM(COALESCE(td."priceBuyAtTime", 0) * td."quantity") as hpp FROM "TransactionDetail" td JOIN "Transaction" t ON t.id = td."transactionId" WHERE t."createdAt" >= ${todayStart} AND t."createdAt" <= ${todayEnd} AND t."isVoid" = false`,
    prisma.$queryRaw<any[]>`SELECT SUM(COALESCE(td."priceBuyAtTime", 0) * td."quantity") as hpp FROM "TransactionDetail" td JOIN "Transaction" t ON t.id = td."transactionId" WHERE t."createdAt" >= ${yesterdayStart} AND t."createdAt" <= ${yesterdayEnd} AND t."isVoid" = false`
  ]);

  const totalSales = todayTxAgg._sum.totalAmount || 0;
  const txCount = todayTxAgg._count.id;
  const avgOrder = txCount > 0 ? totalSales / txCount : 0;

  const yesterdaySales = yesterdayTxAgg._sum.totalAmount || 0;
  const yesterdayCount = yesterdayTxAgg._count.id;

  const totalExpense = todayExpenseAgg._sum.amount || 0;
  const yesterdayTotalExpense = yesterdayExpenseAgg._sum.amount || 0;

  const todayHpp = Number(todayHppResult[0]?.hpp || 0);
  const yesterdayHpp = Number(yesterdayHppResult[0]?.hpp || 0);

  const netProfit = totalSales - todayHpp - totalExpense;
  const yesterdayNetProfit = yesterdaySales - yesterdayHpp - yesterdayTotalExpense;
  
  const profitTrend = yesterdayNetProfit === 0 ? (netProfit > 0 ? 100 : 0) : ((netProfit - yesterdayNetProfit) / Math.abs(yesterdayNetProfit)) * 100;
  const expenseTrend = yesterdayTotalExpense === 0 ? (totalExpense > 0 ? 100 : 0) : ((totalExpense - yesterdayTotalExpense) / yesterdayTotalExpense) * 100;
  
  const salesTrend = yesterdaySales === 0 ? 100 : ((totalSales - yesterdaySales) / yesterdaySales) * 100;
  const countTrend = txCount - yesterdayCount;

  // Member
  const memberCount = await prisma.member.count();

  // Proyeksi Stok (Habis < 7 Hari)
  // Menghitung rata-rata penjualan 7 hari terakhir per produk
  const sevenDaysAgo = startOfDay(subDays(now, 7));
  
  const productSalesAgg: any[] = await prisma.$queryRaw`
    SELECT 
      p.id, 
      p.name, 
      p.stock,
      p.sku,
      COALESCE(SUM(td.quantity), 0) as "totalSold7Days"
    FROM "Product" p
    LEFT JOIN "TransactionDetail" td ON td."productId" = p.id
    LEFT JOIN "Transaction" t ON t.id = td."transactionId" AND t."createdAt" >= ${sevenDaysAgo} AND t."isVoid" = false
    WHERE p.stock > 0
    GROUP BY p.id
  `;

  // Find products that will run out in < 7 days
  let projectedOutProducts = productSalesAgg
    .map(p => {
      const totalSold = Number(p.totalSold7Days);
      const avgDailySales = totalSold / 7;
      const daysLeft = avgDailySales > 0 ? p.stock / avgDailySales : Infinity;
      return {
        id: p.id,
        name: p.name,
        stock: p.stock,
        sku: p.sku,
        avgDailySales,
        daysLeft,
        trendData: [] as number[] // Akan diisi nanti
      };
    })
    .filter(p => p.daysLeft < 7 && p.avgDailySales > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5); // Ambil Top 5 paling kritis

  // Jika ada produk yang masuk daftar kritis, fetch data hariannya untuk Sparkline
  if (projectedOutProducts.length > 0) {
    const productIds = projectedOutProducts.map(p => p.id);
    
    // Ambil data per hari untuk 7 hari terakhir
    const trendRows: any[] = await prisma.$queryRaw`
      SELECT 
        td."productId",
        DATE_TRUNC('day', t."createdAt") as "day",
        SUM(td.quantity) as "dailyQty"
      FROM "TransactionDetail" td
      JOIN "Transaction" t ON t.id = td."transactionId"
      WHERE td."productId" IN (${Prisma.join(productIds)})
        AND t."createdAt" >= ${sevenDaysAgo}
        AND t."isVoid" = false
      GROUP BY td."productId", DATE_TRUNC('day', t."createdAt")
    `;

    // Susun data per hari (7 elemen untuk 7 hari)
    projectedOutProducts = projectedOutProducts.map(p => {
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const targetDayStr = format(startOfDay(subDays(now, i)), 'yyyy-MM-dd');
        // Cari di row
        const row = trendRows.find(r => r.productId === p.id && format(new Date(r.day), 'yyyy-MM-dd') === targetDayStr);
        trendData.push(row ? Number(row.dailyQty) : 0);
      }
      return { ...p, trendData };
    });
  }

  // Data 7 hari untuk chart
  const chartSalesRaw: any[] = await prisma.$queryRaw`
    SELECT DATE_TRUNC('day', "createdAt") as day, SUM("totalAmount") as amount
    FROM "Transaction"
    WHERE "createdAt" >= ${sevenDaysAgo} AND "createdAt" <= ${todayEnd} AND "isVoid" = false
    GROUP BY DATE_TRUNC('day', "createdAt")
  `;

  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(now, i);
    const dayStr = format(date, 'yyyy-MM-dd');
    const row = chartSalesRaw.find(r => format(new Date(r.day), 'yyyy-MM-dd') === dayStr);
    
    chartData.push({
      date: format(date, 'd MMM', { locale: id }),
      amount: row ? Number(row.amount) : 0
    });
  }

  // Ambil Store Status
  const storeStatus = await prisma.storeStatus.findUnique({
    where: { id: 'local-store' }
  });
  
  const lastPing = storeStatus?.lastPing ? new Date(storeStatus.lastPing) : null;
  const minutesSincePing = lastPing ? differenceInMinutes(now, lastPing) : Infinity;
  
  let terminalStatus = { color: 'bg-text-secondary', label: 'Tidak Diketahui', pingText: 'Belum pernah sync' };
  if (minutesSincePing < 5) {
    terminalStatus = { color: 'bg-success', label: 'Terminal Aktif', pingText: `Baru saja (Live)` };
  } else if (minutesSincePing <= 60) {
    terminalStatus = { color: 'bg-success', label: 'Terminal Aktif', pingText: `Terakhir sync: ${minutesSincePing} menit lalu` };
  } else if (minutesSincePing <= 180) {
    terminalStatus = { color: 'bg-warning', label: 'Perlu Diperhatikan', pingText: `Terakhir sync: ${Math.floor(minutesSincePing/60)} jam lalu` };
  } else if (lastPing) {
    terminalStatus = { color: 'bg-danger', label: 'Terminal Offline', pingText: `Tidak ada respons > 3 jam` };
  }

  // Top Products (Aggregasi in-memory untuk hari ini diganti dengan SQL)
  const topProductsRaw: any[] = await prisma.$queryRaw`
    SELECT p.name, SUM(td.quantity) as quantity
    FROM "TransactionDetail" td
    JOIN "Transaction" t ON t.id = td."transactionId"
    JOIN "Product" p ON p.id = td."productId"
    WHERE t."createdAt" >= ${todayStart} AND t."createdAt" <= ${todayEnd} AND t."isVoid" = false
    GROUP BY p.id, p.name
    ORDER BY quantity DESC
    LIMIT 5
  `;

  const topProducts = topProductsRaw.map(p => ({
    name: p.name,
    quantity: Number(p.quantity)
  }));

  const formattedDate = format(now, 'EEEE, dd MMMM yyyy', { locale: id });

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner & Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-text-primary">Selamat pagi, Owner 👋</h2>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border`}>
              <div className={`w-2 h-2 rounded-full ${terminalStatus.color} ${minutesSincePing < 5 ? 'animate-pulse' : ''}`}></div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold leading-tight text-text-primary">{terminalStatus.label}</span>
                <span className="text-[9px] text-text-secondary leading-tight">{terminalStatus.pingText}</span>
              </div>
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
      <div className="bg-surface border border-border rounded-xl overflow-hidden border-l-[3px] border-l-warning shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-warning/5">
          <AlertTriangle className="text-warning" size={20} />
          <h3 className="text-lg font-semibold text-text-primary">Warning: Proyeksi Stok Habis &lt; 7 Hari</h3>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-border text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                <th className="px-6 py-3">Nama Produk</th>
                <th className="px-6 py-3 text-right">Stok Tersisa</th>
                <th className="px-6 py-3 text-right">Rata Penjualan/Hari</th>
                <th className="px-6 py-3 text-center">Estimasi Habis</th>
                <th className="px-6 py-3 text-center w-32">Tren 7 Hari</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {projectedOutProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">Semua stok produk diproyeksikan aman untuk 7 hari ke depan.</td>
                </tr>
              ) : (
                projectedOutProducts.map((p) => {
                  // Generate Simple SVG Sparkline
                  const maxTrend = Math.max(...p.trendData, 1);
                  const minTrend = 0;
                  const sparklinePoints = p.trendData.map((val, idx) => {
                    const x = (idx / 6) * 100;
                    const y = 30 - ((val - minTrend) / (maxTrend - minTrend)) * 30;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <tr key={p.id} className="hover:bg-surface-container-highest transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-text-primary">{p.name}</div>
                        <div className="text-[11px] text-text-secondary">SKU: {p.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="bg-error/10 text-error px-2 py-1 rounded-md font-bold text-xs">{p.stock} Pcs</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-text-secondary">
                        {p.avgDailySales.toFixed(1)} / hari
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-bold text-text-primary">{Math.max(0, Math.ceil(p.daysLeft))}</span>
                          <span className="text-xs text-text-secondary">Hari</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <svg className="w-24 h-8 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                          <polyline 
                            fill="none" 
                            stroke="#eab308" 
                            strokeWidth="2" 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={sparklinePoints} 
                          />
                          {p.trendData.map((val, idx) => {
                            const x = (idx / 6) * 100;
                            const y = 30 - ((val - minTrend) / (maxTrend - minTrend)) * 30;
                            return (
                              <circle key={idx} cx={x} cy={y} r="2" fill="#eab308" />
                            );
                          })}
                        </svg>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/produk/edit/${p.id}`} className="text-text-secondary group-hover:text-primary-container border border-transparent group-hover:border-border px-3 py-1.5 rounded-md transition-all">
                          Restok
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
