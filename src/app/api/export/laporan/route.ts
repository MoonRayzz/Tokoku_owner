import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'excel'; // excel atau pdf
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const shiftParam = searchParams.get('shift');

  const isAllTime = startParam === 'all';
  const todayStr = new Date().toISOString().split('T')[0];
  const start = isAllTime ? new Date('2020-01-01T00:00:00.000Z') : (startParam ? new Date(`${startParam}T00:00:00.000Z`) : new Date(`${todayStr}T00:00:00.000Z`));
  const end = isAllTime ? new Date() : (endParam ? new Date(`${endParam}T23:59:59.999Z`) : new Date(`${todayStr}T23:59:59.999Z`));

  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      isVoid: false,
      ...(shiftParam ? { shiftId: shiftParam } : {})
    },
    include: {
      member: true,
      details: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: start, lte: end },
      isVoid: false,
      ...(shiftParam ? { shiftId: shiftParam } : {})
    },
    include: {
      employee: true
    },
    orderBy: { date: 'desc' }
  });

  if (type === 'excel') {
    const shifts = await prisma.shift.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    const shiftMap = new Map(shifts.map(s => [s.id, s.name]));

    const dailyTrend: Array<{
      date: string | Date;
      count: bigint;
      omzet: number;
      hpp: number;
    }> = await prisma.$queryRaw`
      SELECT 
        DATE(t."createdAt") as date,
        COUNT(t.id) as count,
        SUM(t."totalAmount" - t."discountAmount") as omzet,
        SUM(COALESCE(td."priceBuyAtTime", 0) * td."quantity") as hpp
      FROM "Transaction" t
      LEFT JOIN "TransactionDetail" td ON td."transactionId" = t.id
      WHERE t."createdAt" >= ${start}
        AND t."createdAt" <= ${end}
        AND t."isVoid" = false
        ${shiftParam ? Prisma.sql`AND t."shiftId" = ${shiftParam}` : Prisma.sql``}
      GROUP BY DATE(t."createdAt")
      ORDER BY DATE(t."createdAt") ASC
    `;

    const topProducts: Array<{
      name: string;
      sku: string;
      totalQty: bigint;
      totalOmzet: number;
      totalHpp: number;
    }> = await prisma.$queryRaw`
      SELECT 
        p."name",
        p."sku",
        SUM(td."quantity") as "totalQty",
        SUM(td."subtotal") as "totalOmzet",
        SUM(COALESCE(td."priceBuyAtTime", 0) * td."quantity") as "totalHpp"
      FROM "TransactionDetail" td
      JOIN "Transaction" t ON t."id" = td."transactionId"
      JOIN "Product" p ON p."id" = td."productId"
      WHERE t."createdAt" >= ${start}
        AND t."createdAt" <= ${end}
        AND t."isVoid" = false
      GROUP BY p."id", p."name", p."sku"
      ORDER BY SUM(td."quantity") DESC
      LIMIT 5
    `;

    const debtSummary = await prisma.debt.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { totalAmount: true }
    });
    const cicilanSummary = await prisma.debtPayment.aggregate({
      where: { paidAt: { gte: start, lte: end } },
      _sum: { amount: true }
    });
    const activeDebt = await prisma.debt.aggregate({
      where: { status: { not: 'PAID' } },
      _sum: { remaining: true }
    });

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TokoKu Owner Dashboard';
    workbook.created = new Date();

    // SHEET 1
    const ws1 = workbook.addWorksheet('Data Transaksi');
    ws1.columns = [
      { header: 'No. Nota',      key: 'nota',    width: 28 },
      { header: 'Waktu',         key: 'waktu',   width: 22 },
      { header: 'Kasir',         key: 'kasir',   width: 16 },
      { header: 'Shift',         key: 'shift',   width: 14 },
      { header: 'Member',        key: 'member',  width: 18 },
      { header: 'Metode Bayar',  key: 'metode',  width: 14 },
      { header: 'Omzet (Rp)',    key: 'omzet',   width: 16 },
      { header: 'HPP (Rp)',      key: 'hpp',     width: 16 },
      { header: 'Profit (Rp)',   key: 'profit',  width: 16 },
      { header: 'Margin (%)',    key: 'margin',  width: 12 },
      { header: 'Items',         key: 'items',   width: 50 },
    ];

    ws1.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF059669' } } };
    });
    ws1.getRow(1).height = 20;

    transactions.forEach((tx, idx) => {
      let totalHpp = 0;
      const itemsList: string[] = [];
      tx.details.forEach(d => {
        totalHpp += (d.priceBuyAtTime || 0) * d.quantity;
        itemsList.push(`${d.product.name} (×${d.quantity})`);
      });
      const netto = tx.totalAmount - tx.discountAmount;
      const profit = netto - totalHpp;
      const margin = netto > 0 ? (profit / netto) * 100 : 0;
      const shiftName = tx.shiftId ? (shiftMap.get(tx.shiftId) || '-') : '-';

      const row = ws1.addRow({
        nota:   tx.receiptNumber,
        waktu:  new Date(tx.createdAt).toLocaleString('id-ID'),
        kasir:  tx.cashierName,
        shift:  shiftName,
        member: tx.member?.name || 'Umum',
        metode: tx.paymentMethod.toUpperCase(),
        omzet:  netto,
        hpp:    totalHpp,
        profit: profit,
        margin: parseFloat(margin.toFixed(2)),
        items:  itemsList.join(', '),
      });

      if (idx % 2 === 1) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        });
      }

      ['omzet', 'hpp', 'profit'].forEach(key => {
        const cell = row.getCell(key);
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      });

      row.getCell('margin').numFmt = '0.00"%"';
      row.getCell('margin').alignment = { horizontal: 'center' };

      if (tx.paymentMethod === 'utang') {
        row.getCell('metode').font = { color: { argb: 'FFF59E0B' }, bold: true };
      }
    });

    ws1.views = [{ state: 'frozen', ySplit: 1 }];
    ws1.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 11 } };

    // SHEET 2
    const ws2 = workbook.addWorksheet('Pengeluaran');
    ws2.columns = [
      { header: 'Waktu',        key: 'waktu',     width: 22 },
      { header: 'Kategori',     key: 'kategori',  width: 20 },
      { header: 'Nominal (Rp)', key: 'nominal',   width: 16 },
      { header: 'Kasir',        key: 'kasir',     width: 16 },
      { header: 'Keterangan',   key: 'keterangan',width: 40 },
    ];

    ws2.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws2.getRow(1).height = 20;

    expenses.forEach((e, idx) => {
      const row = ws2.addRow({
        waktu:      new Date(e.date).toLocaleString('id-ID'),
        kategori:   e.category,
        nominal:    e.amount,
        kasir:      e.employee.name,
        keterangan: e.notes || '-',
      });

      if (idx % 2 === 1) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
        });
      }

      row.getCell('nominal').numFmt = '#,##0';
      row.getCell('nominal').alignment = { horizontal: 'right' };
    });

    ws2.views = [{ state: 'frozen', ySplit: 1 }];
    ws2.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } };

    // SHEET 3
    const ws3 = workbook.addWorksheet('Analisis Bisnis');
    ws3.getColumn(1).width = 32;
    ws3.getColumn(2).width = 24;
    ws3.getColumn(3).width = 20;
    ws3.getColumn(4).width = 20;
    ws3.getColumn(5).width = 16;
    ws3.getColumn(6).width = 14;

    const addSectionHeader = (ws: any, title: string, rowNum: number, colSpan: number = 6) => {
      const row = ws.getRow(rowNum);
      row.getCell(1).value = title;
      row.getCell(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
      row.height = 22;
      ws.mergeCells(rowNum, 1, rowNum, colSpan);
    };

    const addLabelValue = (ws: any, label: string, value: any, rowNum: number, isFormula = false, numFmt = '#,##0') => {
      const row = ws.getRow(rowNum);
      row.getCell(1).value = label;
      row.getCell(1).font = { color: { argb: 'FF374151' } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      const valueCell = row.getCell(2);
      valueCell.value = isFormula ? { formula: value } : value;
      valueCell.numFmt = numFmt;
      valueCell.font = { bold: true };
      valueCell.alignment = { horizontal: 'right' };
      row.height = 18;
    };

    let currentRow = 1;

    addSectionHeader(ws3, '📊 RINGKASAN KEUANGAN PERIODE', currentRow);
    currentRow++;

    const periodeLabel = isAllTime ? 'Semua Waktu' : `${startParam || 'today'} s/d ${endParam || startParam || 'today'}`;
    addLabelValue(ws3, 'Periode', periodeLabel, currentRow, false, '@');
    currentRow++;
    addLabelValue(ws3, 'Tanggal Export', new Date().toLocaleString('id-ID'), currentRow, false, '@');
    currentRow++;
    currentRow++;

    let totalOmzetTunai = 0;
    let totalPiutangBaru = 0;
    let totalHppAll = 0;
    
    transactions.forEach(tx => {
      let txHpp = 0;
      tx.details.forEach(d => { txHpp += (d.priceBuyAtTime || 0) * d.quantity; });
      totalHppAll += txHpp;
      
      const netto = tx.totalAmount - tx.discountAmount;
      if (tx.paymentMethod === 'utang') {
        totalPiutangBaru += netto;
      } else {
        totalOmzetTunai += netto;
      }
    });
    
    const totalOmzetSesungguhnya = totalOmzetTunai + totalPiutangBaru;
    const totalPengeluaranAll = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profitKotor = totalOmzetSesungguhnya - totalHppAll;
    const labaBersih = profitKotor - totalPengeluaranAll;
    const cicilanMasuk = cicilanSummary._sum?.amount || 0;
    const kasRealMasuk = totalOmzetTunai + cicilanMasuk;
    const avgMargin = totalOmzetSesungguhnya > 0 ? (profitKotor / totalOmzetSesungguhnya) * 100 : 0;

    addLabelValue(ws3, 'Total Transaksi', transactions.length, currentRow, false, '0');
    currentRow++;
    addLabelValue(ws3, 'Omzet Tunai (Cash/QRIS/Debit)', totalOmzetTunai, currentRow);
    currentRow++;
    addLabelValue(ws3, 'Piutang Baru (Utang)', totalPiutangBaru, currentRow);
    currentRow++;
    addLabelValue(ws3, 'Cicilan Utang Masuk', cicilanMasuk, currentRow);
    currentRow++;
    addLabelValue(ws3, 'Omzet Sesungguhnya (Tunai + Piutang)', totalOmzetSesungguhnya, currentRow);
    ws3.getRow(currentRow).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    ws3.getRow(currentRow).getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    currentRow++;
    addLabelValue(ws3, 'Total HPP (Modal Penjualan)', totalHppAll, currentRow);
    currentRow++;
    addLabelValue(ws3, 'Profit Kotor (Omzet - HPP)', profitKotor, currentRow);
    currentRow++;
    addLabelValue(ws3, 'Total Pengeluaran Operasional', totalPengeluaranAll, currentRow);
    currentRow++;
    addLabelValue(ws3, 'LABA BERSIH (Profit - Pengeluaran)', labaBersih, currentRow);
    const labaBersihCell = ws3.getRow(currentRow).getCell(2);
    labaBersihCell.font = { bold: true, size: 13, color: { argb: labaBersih >= 0 ? 'FF065F46' : 'FFDC2626' } };
    ws3.getRow(currentRow).getCell(1).font = { bold: true, size: 11 };
    currentRow++;
    addLabelValue(ws3, 'Kas Real Masuk (Tunai + Cicilan)', kasRealMasuk, currentRow);
    currentRow++;
    addLabelValue(ws3, 'Rata-rata Margin Keseluruhan', parseFloat(avgMargin.toFixed(2)), currentRow, false, '0.00"%"');
    currentRow++;
    addLabelValue(ws3, 'Piutang Belum Tertagih (Akumulasi)', activeDebt._sum?.remaining || 0, currentRow);
    currentRow += 2;

    addSectionHeader(ws3, '💳 PERFORMA PER METODE PEMBAYARAN', currentRow);
    currentRow++;

    const headerRowB = ws3.getRow(currentRow);
    ['Metode', 'Jumlah Transaksi', 'Total Omzet (Rp)', 'Persentase Omzet'].forEach((h, i) => {
      const cell = headerRowB.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'right' };
      cell.border = { bottom: { style: 'thin' } };
    });
    currentRow++;

    const methodGroups = new Map<string, { count: number; total: number }>();
    transactions.forEach(tx => {
      const method = tx.paymentMethod.toLowerCase();
      const existing = methodGroups.get(method) || { count: 0, total: 0 };
      methodGroups.set(method, {
        count: existing.count + 1,
        total: existing.total + (tx.totalAmount - tx.discountAmount)
      });
    });

    ['cash', 'qris', 'debit', 'utang'].forEach(method => {
      const data = methodGroups.get(method) || { count: 0, total: 0 };
      const pct = totalOmzetSesungguhnya > 0 ? (data.total / totalOmzetSesungguhnya) * 100 : 0;
      const row = ws3.getRow(currentRow);
      row.getCell(1).value = method.toUpperCase();
      row.getCell(2).value = data.count;
      row.getCell(2).numFmt = '0';
      row.getCell(2).alignment = { horizontal: 'right' };
      row.getCell(3).value = data.total;
      row.getCell(3).numFmt = '#,##0';
      row.getCell(3).alignment = { horizontal: 'right' };
      row.getCell(4).value = parseFloat(pct.toFixed(2));
      row.getCell(4).numFmt = '0.00"%"';
      row.getCell(4).alignment = { horizontal: 'right' };
      if (method === 'utang') {
        row.getCell(1).font = { color: { argb: 'FFF59E0B' }, bold: true };
      }
      currentRow++;
    });
    currentRow++;

    if (dailyTrend.length > 1) {
      addSectionHeader(ws3, '📈 TREN HARIAN', currentRow);
      currentRow++;

      const headerRowC = ws3.getRow(currentRow);
      ['Tanggal', 'Jml Transaksi', 'Omzet (Rp)', 'HPP (Rp)', 'Profit (Rp)', 'Margin (%)'].forEach((h, i) => {
        const cell = headerRowC.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.alignment = { horizontal: i === 0 ? 'left' : 'right' };
        cell.border = { bottom: { style: 'thin' } };
      });
      currentRow++;

      dailyTrend.forEach((day, idx) => {
        const omzet = Number(day.omzet || 0);
        const hpp = Number(day.hpp || 0);
        const profit = omzet - hpp;
        const margin = omzet > 0 ? (profit / omzet) * 100 : 0;
        
        const row = ws3.getRow(currentRow);
        const formattedDate = typeof day.date === 'object' && day.date !== null ? (day.date as Date).toISOString().split('T')[0] : String(day.date);
        row.getCell(1).value = formattedDate;
        row.getCell(2).value = Number(day.count);
        row.getCell(2).alignment = { horizontal: 'right' };
        row.getCell(3).value = omzet;
        row.getCell(3).numFmt = '#,##0';
        row.getCell(3).alignment = { horizontal: 'right' };
        row.getCell(4).value = hpp;
        row.getCell(4).numFmt = '#,##0';
        row.getCell(4).alignment = { horizontal: 'right' };
        row.getCell(5).value = profit;
        row.getCell(5).numFmt = '#,##0';
        row.getCell(5).alignment = { horizontal: 'right' };
        row.getCell(5).font = { color: { argb: profit >= 0 ? 'FF065F46' : 'FFDC2626' } };
        row.getCell(6).value = parseFloat(margin.toFixed(2));
        row.getCell(6).numFmt = '0.00"%"';
        row.getCell(6).alignment = { horizontal: 'right' };
        
        if (idx % 2 === 1) {
          row.eachCell({ includeEmpty: false }, cell => {
            if (!cell.fill || (cell.fill as any).fgColor?.argb === 'FFFFFFFF') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }
          });
        }
        currentRow++;
      });
      currentRow++;
    }

    addSectionHeader(ws3, '🏆 TOP 5 PRODUK TERJUAL', currentRow);
    currentRow++;

    const headerRowD = ws3.getRow(currentRow);
    ['Nama Produk', 'SKU', 'Total Terjual', 'Omzet (Rp)', 'HPP (Rp)', 'Margin (%)'].forEach((h, i) => {
      const cell = headerRowD.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      cell.alignment = { horizontal: i <= 1 ? 'left' : 'right' };
      cell.border = { bottom: { style: 'thin' } };
    });
    currentRow++;

    topProducts.forEach((p, idx) => {
      const omzet = Number(p.totalOmzet || 0);
      const hpp = Number(p.totalHpp || 0);
      const margin = omzet > 0 ? ((omzet - hpp) / omzet) * 100 : 0;
      
      const row = ws3.getRow(currentRow);
      row.getCell(1).value = p.name;
      row.getCell(2).value = p.sku;
      row.getCell(3).value = Number(p.totalQty);
      row.getCell(3).alignment = { horizontal: 'right' };
      row.getCell(4).value = omzet;
      row.getCell(4).numFmt = '#,##0';
      row.getCell(4).alignment = { horizontal: 'right' };
      row.getCell(5).value = hpp;
      row.getCell(5).numFmt = '#,##0';
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).value = parseFloat(margin.toFixed(2));
      row.getCell(6).numFmt = '0.00"%"';
      row.getCell(6).alignment = { horizontal: 'right' };
      
      if (idx === 0) {
        row.getCell(1).font = { bold: true, color: { argb: 'FFD97706' } };
      }
      currentRow++;
    });
    currentRow++;

    const totalPiutangBaru2 = debtSummary._sum?.totalAmount || 0;
    if (totalPiutangBaru2 > 0 || cicilanMasuk > 0) {
      addSectionHeader(ws3, '💳 RINGKASAN PIUTANG PERIODE INI', currentRow);
      currentRow++;
      addLabelValue(ws3, 'Piutang Baru Dicatat', totalPiutangBaru2, currentRow);
      currentRow++;
      addLabelValue(ws3, 'Cicilan Diterima', cicilanMasuk, currentRow);
      currentRow++;
      addLabelValue(ws3, 'Total Piutang Aktif (Akumulasi Semua)', activeDebt._sum?.remaining || 0, currentRow);
      currentRow++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const periodLabel = isAllTime ? 'semua-waktu' : `${startParam || 'today'}-${endParam || 'today'}`;
    
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan-analisis-${periodLabel}.xlsx"`,
      }
    });
  }

  if (type === 'pdf') {
    const doc = new jsPDF();
    doc.text(`Laporan Penjualan (${startParam || 'Hari Ini'} - ${endParam || 'Hari Ini'})`, 14, 15);
    
    const tableColumn = ["No. Nota", "Waktu", "Member", "Kasir", "Metode", "Total (Rp)"];
    const tableRows = transactions.map(t => [
      t.receiptNumber,
      new Date(t.createdAt).toLocaleString('id-ID'),
      t.member?.name ?? '-',
      t.cashierName,
      t.paymentMethod.toUpperCase(),
      (t.totalAmount - t.discountAmount).toLocaleString('id-ID')
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    const finalY = (doc as any).lastAutoTable.finalY || 20;
    
    doc.text(`Pengeluaran Operasional`, 14, finalY + 15);
    
    const expenseColumn = ["Waktu", "Kategori", "Kasir", "Nominal (Rp)", "Keterangan"];
    const expensePdfRows = expenses.map(e => [
      new Date(e.date).toLocaleString('id-ID'),
      e.category,
      e.employee.name,
      e.amount.toLocaleString('id-ID'),
      e.notes || '-'
    ]);

    (doc as any).autoTable({
      head: [expenseColumn],
      body: expensePdfRows,
      startY: finalY + 20,
    });

    const pdfOutput = doc.output('arraybuffer');
    return new NextResponse(pdfOutput, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laporan-${startParam || 'today'}-${endParam || 'today'}.pdf"`,
      }
    });
  }

  return new NextResponse('Invalid Type', { status: 400 });
}
