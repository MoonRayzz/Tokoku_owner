import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { createClient } from '@/app/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get('start');
  const endParam   = searchParams.get('end');
  const shiftParam = searchParams.get('shift');

  const isAllTime = startParam === 'all';
  const todayStr  = new Date().toISOString().split('T')[0];
  const start = isAllTime
    ? new Date('2020-01-01T00:00:00.000Z')
    : startParam ? new Date(`${startParam}T00:00:00.000Z`) : new Date(`${todayStr}T00:00:00.000Z`);
  const end = isAllTime
    ? new Date()
    : endParam ? new Date(`${endParam}T23:59:59.999Z`) : new Date(`${todayStr}T23:59:59.999Z`);

  // ─── DATA FETCHING ─────────────────────────────────────────────────────────
  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      isVoid: false,
      ...(shiftParam ? { shiftId: shiftParam } : {}),
    },
    include: { member: true, details: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: start, lte: end },
      isVoid: false,
      ...(shiftParam ? { shiftId: shiftParam } : {}),
    },
    include: { employee: true },
    orderBy: { date: 'desc' },
  });

  const shifts = await prisma.shift.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const shiftMap = new Map(shifts.map(s => [s.id, s.name]));

  const dailyTrend: Array<{
    date: string | Date;
    count: bigint;
    omzet: number;
    hpp: number;
    diskon: number;
  }> = await prisma.$queryRaw`
    SELECT
      DATE(t."createdAt") as date,
      COUNT(t.id) as count,
      SUM(t."totalAmount" - t."discountAmount") as omzet,
      SUM(COALESCE(td."priceBuyAtTime", 0) * td."quantity") as hpp,
      SUM(t."discountAmount") as diskon
    FROM "Transaction" t
    LEFT JOIN "TransactionDetail" td ON td."transactionId" = t.id
    WHERE t."createdAt" >= ${start}
      AND t."createdAt" <= ${end}
      AND t."isVoid" = false
      ${shiftParam ? Prisma.sql`AND t."shiftId" = ${shiftParam}` : Prisma.sql``}
    GROUP BY DATE(t."createdAt")
    ORDER BY DATE(t."createdAt") ASC
  `;

  const allProducts: Array<{
    name: string;
    sku: string;
    totalQty: bigint;
    totalOmzet: number;
    totalHpp: number;
    totalDiskon: number;
  }> = await prisma.$queryRaw`
    SELECT
      p."name",
      p."sku",
      SUM(td."quantity")                                        as "totalQty",
      SUM(td."subtotal")                                        as "totalOmzet",
      SUM(COALESCE(td."priceBuyAtTime", 0) * td."quantity")    as "totalHpp",
      SUM(COALESCE(td."discountAmount", 0))                    as "totalDiskon"
    FROM "TransactionDetail" td
    JOIN "Transaction" t ON t."id" = td."transactionId"
    JOIN "Product" p      ON p."id" = td."productId"
    WHERE t."createdAt" >= ${start}
      AND t."createdAt" <= ${end}
      AND t."isVoid" = false
    GROUP BY p."id", p."name", p."sku"
    ORDER BY SUM(td."quantity") DESC
  `;

  const debtSummary   = await prisma.debt.aggregate({ where: { createdAt: { gte: start, lte: end }, status: { not: 'VOID' } }, _sum: { totalAmount: true } });
  const cicilanSummary = await prisma.debtPayment.aggregate({ where: { paidAt: { gte: start, lte: end } }, _sum: { amount: true } });
  const activeDebt    = await prisma.debt.aggregate({ where: { status: { notIn: ['PAID', 'VOID'] } }, _sum: { remaining: true } });

  // ─── KALKULASI UTAMA ───────────────────────────────────────────────────────
  let totalOmzetTunai = 0, totalPiutangBaru = 0, totalHppAll = 0, totalDiskonAll = 0;
  transactions.forEach(tx => {
    let txHpp = 0;
    tx.details.forEach(d => { txHpp += (d.priceBuyAtTime || 0) * d.quantity; });
    totalHppAll += txHpp;
    totalDiskonAll += tx.discountAmount;
    const netto = tx.totalAmount - tx.discountAmount;
    if (tx.paymentMethod === 'utang') totalPiutangBaru += netto;
    else totalOmzetTunai += netto;
  });

  const totalOmzetBruto         = transactions.reduce((s, t) => s + t.totalAmount, 0);
  const totalOmzetSesungguhnya  = totalOmzetTunai + totalPiutangBaru;
  const totalPengeluaranAll     = expenses.reduce((s, e) => s + e.amount, 0);
  const profitKotor             = totalOmzetSesungguhnya - totalHppAll;
  const labaBersih              = profitKotor - totalPengeluaranAll;
  const cicilanMasuk            = cicilanSummary._sum?.amount || 0;
  const kasRealMasuk            = totalOmzetTunai + cicilanMasuk;
  const avgMargin               = totalOmzetSesungguhnya > 0 ? (profitKotor / totalOmzetSesungguhnya) * 100 : 0;
  const omzetPerTx              = transactions.length > 0 ? totalOmzetSesungguhnya / transactions.length : 0;

  // ─── EXCEL BUILD ───────────────────────────────────────────────────────────
  const ExcelJS = await import('exceljs');
  const wb      = new ExcelJS.Workbook();
  wb.creator    = 'TokoKu Owner Dashboard';
  wb.created    = new Date();

  const EMERALD  = '10B981';
  const RED      = 'EF4444';
  const NAVY     = '1E3A5F';
  const GOLD     = 'D97706';
  const GREEN_DK = '065F46';
  const GRAY_BG  = 'F9FAFB';
  const GRAY_HD  = 'E5E7EB';

  const styleHeader = (row: any, bgArgb: string) => {
    row.eachCell({ includeEmpty: true }, (cell: any) => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bgArgb}` } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      cell.border    = { bottom: { style: 'medium', color: { argb: `FF${bgArgb}` } } };
    });
    row.height = 22;
  };

  const styleSubHeader = (row: any) => {
    row.eachCell({ includeEmpty: true }, (cell: any) => {
      cell.font      = { bold: true, size: 10 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRAY_HD}` } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = { bottom: { style: 'thin' } };
    });
    row.height = 18;
  };

  const altRow = (row: any, light: string) => {
    row.eachCell({ includeEmpty: false }, (cell: any) => {
      if (!(cell.fill?.fgColor?.argb) || cell.fill.fgColor.argb === 'FFFFFFFF') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${light}` } };
      }
    });
  };

  const rp = (v: number) => v.toLocaleString('id-ID');

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1 — RINGKASAN KEUANGAN EKSEKUTIF
  // ══════════════════════════════════════════════════════════════════════════
  const wsRing = wb.addWorksheet('Ringkasan Keuangan');
  wsRing.getColumn(1).width = 38;
  wsRing.getColumn(2).width = 22;
  wsRing.getColumn(3).width = 22;
  wsRing.getColumn(4).width = 22;
  wsRing.getColumn(5).width = 18;
  wsRing.getColumn(6).width = 16;

  let r = 1;

  const addTitle = (ws: any, title: string, sub: string) => {
    const t1 = ws.getRow(r++);
    ws.mergeCells(r - 1, 1, r - 1, 6);
    t1.getCell(1).value = title;
    t1.getCell(1).font  = { bold: true, size: 15, color: { argb: `FF${NAVY}` } };
    t1.getCell(1).alignment = { horizontal: 'center' };
    t1.height = 28;

    const t2 = ws.getRow(r++);
    ws.mergeCells(r - 1, 1, r - 1, 6);
    t2.getCell(1).value = sub;
    t2.getCell(1).font  = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
    t2.getCell(1).alignment = { horizontal: 'center' };
    r++;
  };

  const addSecHeader = (ws: any, title: string, colSpan = 6) => {
    const row = ws.getRow(r);
    ws.mergeCells(r, 1, r, colSpan);
    row.getCell(1).value = `  ${title}`;
    row.getCell(1).font  = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    row.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
    row.height = 22;
    r++;
  };

  const addKV = (ws: any, label: string, value: any, numFmt = '#,##0', boldValue = false, highlight = false) => {
    const row = ws.getRow(r);
    row.getCell(1).value = `  ${label}`;
    row.getCell(1).font  = { size: 10, color: { argb: 'FF374151' } };
    row.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: highlight ? 'FFD1FAE5' : `FF${GRAY_BG}` } };
    const vc = row.getCell(2);
    vc.value = value;
    vc.numFmt = numFmt;
    vc.font   = boldValue ? { bold: true, size: 11 } : { size: 10 };
    vc.alignment = { horizontal: 'right' };
    vc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: highlight ? 'FFD1FAE5' : `FF${GRAY_BG}` } };
    row.height = 18;
    r++;
  };

  const periodeLabel = isAllTime
    ? 'Semua Waktu'
    : `${startParam || todayStr} s/d ${endParam || startParam || todayStr}`;

  addTitle(wsRing, '📊 LAPORAN KEUANGAN KOMPREHENSIF — TokoKu', `Periode: ${periodeLabel}  |  Diekspor: ${new Date().toLocaleString('id-ID')}`);

  // === BLOK A: KPI Utama
  addSecHeader(wsRing, '💹 A. KEY PERFORMANCE INDICATOR (KPI)');
  addKV(wsRing, 'Total Transaksi', transactions.length, '0 "nota"');
  addKV(wsRing, 'Omzet Bruto (sebelum diskon)', totalOmzetBruto);
  addKV(wsRing, 'Total Diskon Diberikan', totalDiskonAll);
  addKV(wsRing, 'Omzet Tunai (Cash/QRIS/Debit)', totalOmzetTunai, '#,##0', false, true);
  addKV(wsRing, 'Piutang Baru (Bayar Utang)', totalPiutangBaru);
  addKV(wsRing, 'Cicilan Utang Diterima', cicilanMasuk);
  addKV(wsRing, 'Total Omzet (Tunai + Piutang Baru)', totalOmzetSesungguhnya, '#,##0', true, true);
  addKV(wsRing, 'Rata-rata Nilai per Transaksi', omzetPerTx);
  r++;

  // === BLOK B: Laba Rugi
  addSecHeader(wsRing, '📉 B. LAPORAN LABA RUGI SEDERHANA');
  addKV(wsRing, 'Total Omzet', totalOmzetSesungguhnya);
  addKV(wsRing, '(-) Total HPP / Modal Penjualan', totalHppAll);
  addKV(wsRing, '(=) Laba Kotor', profitKotor, '#,##0', true, profitKotor >= 0);
  addKV(wsRing, 'Margin Laba Kotor (%)', parseFloat(avgMargin.toFixed(2)), '0.00"%"');
  addKV(wsRing, '(-) Pengeluaran Operasional', totalPengeluaranAll);
  addKV(wsRing, '(=) LABA BERSIH', labaBersih, '#,##0', true, labaBersih >= 0);
  // Color laba bersih
  {
    const labaBersihRow = wsRing.getRow(r - 1);
    const labaBersihVC  = labaBersihRow.getCell(2);
    labaBersihVC.font  = { bold: true, size: 13, color: { argb: labaBersih >= 0 ? `FF${GREEN_DK}` : `FF${RED}` } };
    labaBersihRow.getCell(1).font = { bold: true, size: 11 };
  }
  r++;

  // === BLOK C: Kas
  addSecHeader(wsRing, '🏦 C. POSISI KAS & PIUTANG');
  addKV(wsRing, 'Kas Real Masuk (Tunai + Cicilan)', kasRealMasuk, '#,##0', true, true);
  addKV(wsRing, 'Piutang Aktif (Akumulasi belum lunas)', activeDebt._sum?.remaining || 0);
  addKV(wsRing, 'Piutang Baru Periode Ini', totalPiutangBaru);
  addKV(wsRing, 'Cicilan Masuk Periode Ini', cicilanMasuk);
  r++;

  // === BLOK D: Metode Pembayaran
  addSecHeader(wsRing, '💳 D. BREAKDOWN METODE PEMBAYARAN');
  const mhRow = wsRing.getRow(r);
  ['Metode', 'Jml Transaksi', 'Total Omzet (Rp)', 'Persentase', 'Kontribusi Kas Real'].forEach((h, i) => {
    const c = mhRow.getCell(i + 1);
    c.value = h;
    c.font  = { bold: true, size: 10 };
    c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRAY_HD}` } };
    c.alignment = { horizontal: i === 0 ? 'left' : 'right' };
    c.border = { bottom: { style: 'thin' } };
  });
  r++;

  const methodMap = new Map<string, { count: number; total: number }>();
  transactions.forEach(tx => {
    const m = tx.paymentMethod.toLowerCase();
    const ex = methodMap.get(m) || { count: 0, total: 0 };
    methodMap.set(m, { count: ex.count + 1, total: ex.total + (tx.totalAmount - tx.discountAmount) });
  });

  const methodOrder = ['cash', 'qris', 'debit', 'transfer', 'utang'];
  methodOrder.forEach(method => {
    const d   = methodMap.get(method) || { count: 0, total: 0 };
    const pct = totalOmzetSesungguhnya > 0 ? (d.total / totalOmzetSesungguhnya) * 100 : 0;
    const row = wsRing.getRow(r);
    row.getCell(1).value = method === 'utang' ? '⚠ UTANG' : method.toUpperCase();
    row.getCell(2).value = d.count;
    row.getCell(2).numFmt = '0';
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).value = d.total;
    row.getCell(3).numFmt = '#,##0';
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(4).value = parseFloat(pct.toFixed(2));
    row.getCell(4).numFmt = '0.00"%"';
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(5).value = method !== 'utang' ? d.total : 0;
    row.getCell(5).numFmt = '#,##0';
    row.getCell(5).alignment = { horizontal: 'right' };
    if (method === 'utang') {
      row.getCell(1).font = { color: { argb: `FF${GOLD}` }, bold: true };
    }
    r++;
  });
  r++;

  // === BLOK E: Pengeluaran per Kategori
  addSecHeader(wsRing, '📋 E. PENGELUARAN PER KATEGORI');
  const ehRow = wsRing.getRow(r);
  ['Kategori', 'Jml Transaksi', 'Total (Rp)', 'Persentase dari Total'].forEach((h, i) => {
    const c = ehRow.getCell(i + 1);
    c.value = h;
    c.font  = { bold: true, size: 10 };
    c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRAY_HD}` } };
    c.alignment = { horizontal: i === 0 ? 'left' : 'right' };
    c.border = { bottom: { style: 'thin' } };
  });
  r++;

  const catMap = new Map<string, { count: number; total: number }>();
  expenses.forEach(e => {
    const ex = catMap.get(e.category) || { count: 0, total: 0 };
    catMap.set(e.category, { count: ex.count + 1, total: ex.total + e.amount });
  });
  [...catMap.entries()].sort((a, b) => b[1].total - a[1].total).forEach(([cat, d]) => {
    const pct = totalPengeluaranAll > 0 ? (d.total / totalPengeluaranAll) * 100 : 0;
    const row = wsRing.getRow(r);
    row.getCell(1).value = cat;
    row.getCell(2).value = d.count;
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).value = d.total;
    row.getCell(3).numFmt = '#,##0';
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(4).value = parseFloat(pct.toFixed(2));
    row.getCell(4).numFmt = '0.00"%"';
    row.getCell(4).alignment = { horizontal: 'right' };
    r++;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2 — TREN HARIAN
  // ══════════════════════════════════════════════════════════════════════════
  const wsTren = wb.addWorksheet('Tren Harian');
  wsTren.columns = [
    { header: 'Tanggal',         key: 'tgl',    width: 16 },
    { header: 'Jml Transaksi',   key: 'cnt',    width: 16 },
    { header: 'Total Diskon (Rp)', key: 'dis', width: 20 },
    { header: 'Omzet Netto (Rp)', key: 'omz',  width: 20 },
    { header: 'HPP (Rp)',        key: 'hpp',    width: 18 },
    { header: 'Laba Kotor (Rp)', key: 'laba',  width: 20 },
    { header: 'Margin (%)',      key: 'mrg',    width: 14 },
  ];
  styleHeader(wsTren.getRow(1), NAVY);
  wsTren.views = [{ state: 'frozen', ySplit: 1 }];
  wsTren.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 7 } };

  dailyTrend.forEach((day, idx) => {
    const omzet  = Number(day.omzet || 0);
    const hpp    = Number(day.hpp   || 0);
    const diskon = Number(day.diskon || 0);
    const laba   = omzet - hpp;
    const margin = omzet > 0 ? (laba / omzet) * 100 : 0;
    const tgl    = typeof day.date === 'object' ? (day.date as Date).toISOString().split('T')[0] : String(day.date);
    const row    = wsTren.addRow({ tgl, cnt: Number(day.count), dis: diskon, omz: omzet, hpp, laba, mrg: parseFloat(margin.toFixed(2)) });
    row.getCell('dis').numFmt  = '#,##0';
    row.getCell('omz').numFmt  = '#,##0';
    row.getCell('hpp').numFmt  = '#,##0';
    row.getCell('laba').numFmt = '#,##0';
    row.getCell('mrg').numFmt  = '0.00"%"';
    row.getCell('laba').font   = { color: { argb: laba >= 0 ? `FF${GREEN_DK}` : `FF${RED}` } };
    ['dis','omz','hpp','laba','mrg'].forEach(k => row.getCell(k).alignment = { horizontal: 'right' });
    if (idx % 2 === 1) altRow(row, 'F0FDF4');
  });

  // Total row
  const tTren = wsTren.addRow({
    tgl: 'TOTAL', cnt: transactions.length, dis: totalDiskonAll,
    omz: totalOmzetSesungguhnya, hpp: totalHppAll,
    laba: profitKotor, mrg: parseFloat(avgMargin.toFixed(2))
  });
  tTren.eachCell({ includeEmpty: true }, (cell: any) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FFD1FAE5` } };
  });
  ['dis','omz','hpp','laba'].forEach(k => { tTren.getCell(k).numFmt = '#,##0'; tTren.getCell(k).alignment = { horizontal: 'right' }; });
  tTren.getCell('mrg').numFmt = '0.00"%"'; tTren.getCell('mrg').alignment = { horizontal: 'right' };

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 3 — DATA TRANSAKSI DETAIL
  // ══════════════════════════════════════════════════════════════════════════
  const wsTx = wb.addWorksheet('Data Transaksi');
  wsTx.columns = [
    { header: 'No. Nota',       key: 'nota',    width: 26 },
    { header: 'Waktu',          key: 'waktu',   width: 22 },
    { header: 'Kasir',          key: 'kasir',   width: 16 },
    { header: 'Shift',          key: 'shift',   width: 14 },
    { header: 'Member',         key: 'member',  width: 20 },
    { header: 'Metode',         key: 'metode',  width: 12 },
    { header: 'Bruto (Rp)',     key: 'bruto',   width: 16 },
    { header: 'Diskon (Rp)',    key: 'diskon',  width: 14 },
    { header: 'Netto (Rp)',     key: 'netto',   width: 16 },
    { header: 'HPP (Rp)',       key: 'hpp',     width: 16 },
    { header: 'Profit (Rp)',    key: 'profit',  width: 16 },
    { header: 'Margin (%)',     key: 'margin',  width: 12 },
    { header: 'Item Dibeli',    key: 'items',   width: 55 },
  ];
  styleHeader(wsTx.getRow(1), EMERALD);
  wsTx.views = [{ state: 'frozen', ySplit: 1 }];
  wsTx.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 13 } };

  transactions.forEach((tx, idx) => {
    let txHpp = 0;
    const itemsList: string[] = [];
    tx.details.forEach(d => {
      txHpp += (d.priceBuyAtTime || 0) * d.quantity;
      itemsList.push(`${d.product.name} ×${d.quantity} @${rp(d.priceAtTime)}`);
    });
    const netto  = tx.totalAmount - tx.discountAmount;
    const profit = netto - txHpp;
    const margin = netto > 0 ? (profit / netto) * 100 : 0;

    const row = wsTx.addRow({
      nota:   tx.receiptNumber,
      waktu:  new Date(tx.createdAt).toLocaleString('id-ID'),
      kasir:  tx.cashierName,
      shift:  tx.shiftId ? (shiftMap.get(tx.shiftId) || '-') : '-',
      member: tx.member?.name || 'Umum',
      metode: tx.paymentMethod.toUpperCase(),
      bruto:  tx.totalAmount,
      diskon: tx.discountAmount,
      netto,
      hpp:    txHpp,
      profit,
      margin: parseFloat(margin.toFixed(2)),
      items:  itemsList.join(' | '),
    });

    ['bruto','diskon','netto','hpp','profit'].forEach(k => {
      row.getCell(k).numFmt = '#,##0';
      row.getCell(k).alignment = { horizontal: 'right' };
    });
    row.getCell('margin').numFmt = '0.00"%"';
    row.getCell('margin').alignment = { horizontal: 'center' };
    row.getCell('profit').font = { color: { argb: profit >= 0 ? `FF${GREEN_DK}` : `FF${RED}` } };
    if (tx.paymentMethod === 'utang') {
      row.getCell('metode').font = { color: { argb: `FF${GOLD}` }, bold: true };
    }
    if (idx % 2 === 1) altRow(row, 'F0FDF4');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 4 — ANALISIS PRODUK TERJUAL
  // ══════════════════════════════════════════════════════════════════════════
  const wsProd = wb.addWorksheet('Analisis Produk');
  wsProd.columns = [
    { header: 'Rank',              key: 'rank',  width: 8 },
    { header: 'SKU',               key: 'sku',   width: 16 },
    { header: 'Nama Produk',       key: 'name',  width: 34 },
    { header: 'Total Terjual (pcs)', key: 'qty', width: 20 },
    { header: 'Omzet (Rp)',        key: 'omz',   width: 18 },
    { header: 'HPP Total (Rp)',    key: 'hpp',   width: 18 },
    { header: 'Laba (Rp)',         key: 'laba',  width: 18 },
    { header: 'Margin (%)',        key: 'mrg',   width: 14 },
    { header: 'Kontribusi Omzet (%)', key: 'ktb', width: 20 },
  ];
  styleHeader(wsProd.getRow(1), GOLD);
  wsProd.views = [{ state: 'frozen', ySplit: 1 }];
  wsProd.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 } };

  allProducts.forEach((p, idx) => {
    const omzet = Number(p.totalOmzet || 0);
    const hpp   = Number(p.totalHpp   || 0);
    const laba  = omzet - hpp;
    const margin = omzet > 0 ? (laba / omzet) * 100 : 0;
    const ktb    = totalOmzetSesungguhnya > 0 ? (omzet / totalOmzetSesungguhnya) * 100 : 0;

    const row = wsProd.addRow({
      rank: idx + 1,
      sku:  p.sku,
      name: p.name,
      qty:  Number(p.totalQty),
      omz:  omzet,
      hpp,
      laba,
      mrg:  parseFloat(margin.toFixed(2)),
      ktb:  parseFloat(ktb.toFixed(2)),
    });

    ['omz','hpp','laba'].forEach(k => { row.getCell(k).numFmt = '#,##0'; row.getCell(k).alignment = { horizontal: 'right' }; });
    ['mrg','ktb'].forEach(k => { row.getCell(k).numFmt = '0.00"%"'; row.getCell(k).alignment = { horizontal: 'right' }; });
    row.getCell('qty').alignment = { horizontal: 'right' };
    row.getCell('rank').alignment = { horizontal: 'center' };
    row.getCell('laba').font = { color: { argb: laba >= 0 ? `FF${GREEN_DK}` : `FF${RED}` } };

    if (idx === 0) {
      row.getCell('name').font = { bold: true, color: { argb: `FF${GOLD}` } };
      row.getCell('rank').value = '🏆 1';
    }
    if (idx % 2 === 1) altRow(row, 'FFFBEB');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 5 — PENGELUARAN OPERASIONAL
  // ══════════════════════════════════════════════════════════════════════════
  const wsExp = wb.addWorksheet('Pengeluaran Operasional');
  wsExp.columns = [
    { header: 'Waktu',          key: 'waktu',   width: 22 },
    { header: 'Kategori',       key: 'kat',     width: 22 },
    { header: 'Nominal (Rp)',   key: 'nominal', width: 18 },
    { header: 'Dibuat Oleh',    key: 'kasir',   width: 20 },
    { header: 'Keterangan',     key: 'ket',     width: 42 },
  ];
  styleHeader(wsExp.getRow(1), RED);
  wsExp.views = [{ state: 'frozen', ySplit: 1 }];
  wsExp.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } };

  expenses.forEach((e, idx) => {
    const row = wsExp.addRow({
      waktu:   new Date(e.date).toLocaleString('id-ID'),
      kat:     e.category,
      nominal: e.amount,
      kasir:   e.employee?.name || '-',
      ket:     e.notes || '-',
    });
    row.getCell('nominal').numFmt = '#,##0';
    row.getCell('nominal').alignment = { horizontal: 'right' };
    if (idx % 2 === 1) altRow(row, 'FFF1F2');
  });

  // Total Pengeluaran row
  const tExp = wsExp.addRow({ waktu: '', kat: 'TOTAL PENGELUARAN', nominal: totalPengeluaranAll, kasir: '', ket: `${expenses.length} pos pengeluaran` });
  tExp.eachCell({ includeEmpty: false }, (cell: any) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FFFECACA` } };
  });
  tExp.getCell('nominal').numFmt = '#,##0';
  tExp.getCell('nominal').alignment = { horizontal: 'right' };

  // ─── RETURN ─────────────────────────────────────────────────────────────
  const buffer     = await wb.xlsx.writeBuffer();
  const periodSlug = isAllTime ? 'semua-waktu' : `${startParam || todayStr}-sd-${endParam || startParam || todayStr}`;

  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Laporan-Keuangan-${periodSlug}.xlsx"`,
    },
  });
}
