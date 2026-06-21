import React from 'react';
import { prisma } from '@/lib/db';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import AnalitikClient from './AnalitikClient';

export default async function LaporanAnalitikPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const startParam = typeof resolvedParams.start === 'string' ? resolvedParams.start : '';
  const endParam = typeof resolvedParams.end === 'string' ? resolvedParams.end : '';

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  
  // Parse date or default to last 30 days for analytics
  const startDate = startParam ? new Date(`${startParam}T00:00:00`) : startOfDay(subDays(now, 30));
  const endDate = endParam ? new Date(`${endParam}T23:59:59`) : endOfDay(now);

  // Raw SQL Query for performance and accurate analytics (ignoring VOID transactions)
  // 1. Get total sales, omzet, profit within date range
  // 2. Get lastSold across ALL time
  const analyticsData: any[] = await prisma.$queryRaw`
    SELECT 
      p.id as "productId",
      p.name as "productName",
      p.stock as "stock",
      COALESCE(sales."totalSold", 0) as "totalSold",
      COALESCE(sales."omzet", 0) as "omzet",
      COALESCE(sales."profit", 0) as "profit",
      last_sale."lastSold"
    FROM "Product" p
    LEFT JOIN (
      SELECT 
        td."productId",
        SUM(td.quantity) as "totalSold",
        SUM(td.subtotal) as "omzet",
        SUM(td.quantity * (td."priceAtTime" - COALESCE(td."priceBuyAtTime", 0))) as "profit"
      FROM "TransactionDetail" td
      JOIN "Transaction" t ON t.id = td."transactionId"
      WHERE t."isVoid" = false
        AND t."createdAt" >= ${startDate}
        AND t."createdAt" <= ${endDate}
      GROUP BY td."productId"
    ) sales ON sales."productId" = p.id
    LEFT JOIN (
      SELECT 
        td."productId",
        MAX(t."createdAt") as "lastSold"
      FROM "TransactionDetail" td
      JOIN "Transaction" t ON t.id = td."transactionId"
      WHERE t."isVoid" = false
      GROUP BY td."productId"
    ) last_sale ON last_sale."productId" = p.id
  `;

  // Format data for client component
  const formattedData = analyticsData.map(d => {
    const profit = Number(d.profit);
    const omzet = Number(d.omzet);
    const margin = omzet > 0 ? (profit / omzet) * 100 : 0;

    return {
      id: d.productId,
      name: d.productName,
      stock: Number(d.stock),
      totalSold: Number(d.totalSold),
      omzet: omzet,
      profit: profit,
      margin: margin,
      lastSold: d.lastSold ? new Date(d.lastSold).toISOString() : null
    };
  });

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
      {/* Page Header */}
      <section>
        <h2 className="text-2xl font-bold text-text-primary">Analitik Produk</h2>
        <p className="text-sm text-text-secondary mt-1">Wawasan performa penjualan produk dan analisis pergerakan stok</p>
      </section>

      {/* Tabs Navigasi Laporan */}
      <div className="flex border-b border-border mb-6">
        <Link 
          href="/laporan" 
          className="px-4 py-2 border-b-2 border-transparent text-text-secondary hover:text-text-primary font-medium text-sm transition-colors"
        >
          Laporan Transaksi Umum
        </Link>
        <Link 
          href="/laporan/analitik" 
          className="px-4 py-2 border-b-2 border-primary-container text-primary-container font-medium text-sm"
        >
          Analitik Produk Terlaris
        </Link>
      </div>

      {/* Filter Bar */}
      <section className="bg-surface border border-border rounded-xl p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Link 
            href={`/laporan/analitik?start=${format(subDays(now, 7), 'yyyy-MM-dd')}&end=${todayStr}`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${startParam === format(subDays(now, 7), 'yyyy-MM-dd') ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-variant hover:text-text-primary border border-transparent'}`}
          >
            7 Hari Terakhir
          </Link>
          <Link 
            href={`/laporan/analitik?start=${format(subDays(now, 30), 'yyyy-MM-dd')}&end=${todayStr}`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${(!startParam || startParam === format(subDays(now, 30), 'yyyy-MM-dd')) ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-variant hover:text-text-primary border border-transparent'}`}
          >
            30 Hari Terakhir
          </Link>
          <div className="flex bg-surface border border-border rounded-lg px-2 items-center h-9 shadow-sm ml-2">
            <span className="material-symbols-outlined text-text-secondary text-[16px] mr-2">date_range</span>
            <span className="text-xs font-medium text-text-secondary">Custom range dapat dipilih dari URL parameter `start` dan `end`.</span>
          </div>
        </div>
      </section>

      {/* Client Component for Charts and Table */}
      <AnalitikClient data={formattedData} />
    </div>
  );
}
