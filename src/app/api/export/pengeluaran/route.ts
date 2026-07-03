import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate)   dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const expenses = await prisma.expense.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        isVoid: false,
      },
      orderBy: { date: 'desc' },
      include: { employee: true },
    });

    // ─── KALKULASI ──────────────────────────────────────────────────────────
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

    const catMap = new Map<string, { count: number; total: number }>();
    expenses.forEach(e => {
      const ex = catMap.get(e.category) || { count: 0, total: 0 };
      catMap.set(e.category, { count: ex.count + 1, total: ex.total + e.amount });
    });

    const picMap = new Map<string, { count: number; total: number }>();
    expenses.forEach(e => {
      const name = e.employee?.name || 'Unknown';
      const ex = picMap.get(name) || { count: 0, total: 0 };
      picMap.set(name, { count: ex.count + 1, total: ex.total + e.amount });
    });

    const ExcelJS = await import('exceljs');
    const wb      = new ExcelJS.Workbook();
    wb.creator    = 'TokoKu Owner Dashboard';
    wb.created    = new Date();

    const NAVY    = '1E3A5F';
    const RED     = 'EF4444';
    const GRAY_HD = 'E5E7EB';
    const GRAY_BG = 'F9FAFB';

    const styleHeader = (row: any, bgArgb: string) => {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bgArgb}` } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border    = { bottom: { style: 'medium' } };
      });
      row.height = 22;
    };

    const altRow = (row: any, lightArgb: string) => {
      row.eachCell({ includeEmpty: false }, (cell: any) => {
        if (!(cell.fill?.fgColor?.argb) || cell.fill.fgColor.argb === 'FFFFFFFF') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${lightArgb}` } };
        }
      });
    };

    const periodeLabel = startDate
      ? `${startDate} s/d ${endDate || startDate}`
      : 'Semua Waktu';

    // ══════════════════════════════════════════════════════════════════════════
    // SHEET 1 — RINGKASAN PENGELUARAN
    // ══════════════════════════════════════════════════════════════════════════
    const wsRing = wb.addWorksheet('Ringkasan Pengeluaran');
    wsRing.getColumn(1).width = 36;
    wsRing.getColumn(2).width = 22;
    wsRing.getColumn(3).width = 20;
    wsRing.getColumn(4).width = 18;

    let r = 1;
    wsRing.mergeCells(r, 1, r, 4);
    const t1 = wsRing.getRow(r);
    t1.getCell(1).value = '📋 LAPORAN PENGELUARAN OPERASIONAL — TokoKu';
    t1.getCell(1).font  = { bold: true, size: 15, color: { argb: `FF${NAVY}` } };
    t1.getCell(1).alignment = { horizontal: 'center' };
    t1.height = 28; r++;

    wsRing.mergeCells(r, 1, r, 4);
    const t2 = wsRing.getRow(r);
    t2.getCell(1).value = `Periode: ${periodeLabel}  |  Diekspor: ${new Date().toLocaleString('id-ID')}`;
    t2.getCell(1).font  = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
    t2.getCell(1).alignment = { horizontal: 'center' };
    r += 2;

    const addSecHeader = (title: string, cols = 4) => {
      wsRing.mergeCells(r, 1, r, cols);
      const row = wsRing.getRow(r);
      row.getCell(1).value = `  ${title}`;
      row.getCell(1).font  = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      row.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
      row.height = 22; r++;
    };

    const addKV = (label: string, value: any, numFmt = '#,##0') => {
      const row = wsRing.getRow(r);
      row.getCell(1).value = `  ${label}`;
      row.getCell(1).font  = { size: 10, color: { argb: 'FF374151' } };
      row.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRAY_BG}` } };
      const vc = row.getCell(2);
      vc.value = value; vc.numFmt = numFmt;
      vc.font  = { size: 10 };
      vc.alignment = { horizontal: 'right' };
      vc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRAY_BG}` } };
      row.height = 18; r++;
    };

    // KPI
    addSecHeader('💰 TOTAL PENGELUARAN');
    addKV('Total Pos Pengeluaran', expenses.length, '0 "pos"');
    addKV('TOTAL NOMINAL', totalAmount);
    wsRing.getRow(r - 1).getCell(2).font = { bold: true, size: 13, color: { argb: `FF${RED}` } };
    wsRing.getRow(r - 1).getCell(1).font = { bold: true };
    r++;

    // Breakdown per kategori
    addSecHeader('📊 BREAKDOWN PER KATEGORI');
    const chRow = wsRing.getRow(r);
    ['Kategori', 'Jumlah Pos', 'Total (Rp)', 'Persentase'].forEach((h, i) => {
      const c = chRow.getCell(i + 1);
      c.value = h;
      c.font  = { bold: true, size: 10 };
      c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRAY_HD}` } };
      c.alignment = { horizontal: i === 0 ? 'left' : 'right' };
      c.border = { bottom: { style: 'thin' } };
    });
    r++;

    [...catMap.entries()].sort((a, b) => b[1].total - a[1].total).forEach(([cat, d]) => {
      const pct = totalAmount > 0 ? (d.total / totalAmount) * 100 : 0;
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
    r++;

    // Breakdown per PIC
    addSecHeader('👤 BREAKDOWN PER KARYAWAN');
    const phRow = wsRing.getRow(r);
    ['Nama Karyawan', 'Jumlah Pos', 'Total (Rp)', 'Persentase'].forEach((h, i) => {
      const c = phRow.getCell(i + 1);
      c.value = h;
      c.font  = { bold: true, size: 10 };
      c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRAY_HD}` } };
      c.alignment = { horizontal: i === 0 ? 'left' : 'right' };
      c.border = { bottom: { style: 'thin' } };
    });
    r++;

    [...picMap.entries()].sort((a, b) => b[1].total - a[1].total).forEach(([name, d]) => {
      const pct = totalAmount > 0 ? (d.total / totalAmount) * 100 : 0;
      const row = wsRing.getRow(r);
      row.getCell(1).value = name;
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
    // SHEET 2 — DETAIL PENGELUARAN
    // ══════════════════════════════════════════════════════════════════════════
    const wsDetail = wb.addWorksheet('Detail Pengeluaran');
    wsDetail.columns = [
      { header: 'No.',            key: 'no',      width: 6  },
      { header: 'Tanggal',        key: 'tgl',     width: 22 },
      { header: 'Kategori',       key: 'kat',     width: 22 },
      { header: 'Nominal (Rp)',   key: 'nominal', width: 18 },
      { header: 'Dibuat Oleh',    key: 'kasir',   width: 22 },
      { header: 'Keterangan',     key: 'ket',     width: 42 },
    ];
    styleHeader(wsDetail.getRow(1), RED);
    wsDetail.views = [{ state: 'frozen', ySplit: 1 }];
    wsDetail.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };

    expenses.forEach((e, idx) => {
      const row = wsDetail.addRow({
        no:      idx + 1,
        tgl:     new Date(e.date).toLocaleString('id-ID'),
        kat:     e.category,
        nominal: e.amount,
        kasir:   e.employee?.name || '-',
        ket:     e.notes || '-',
      });
      row.getCell('nominal').numFmt = '#,##0';
      row.getCell('nominal').alignment = { horizontal: 'right' };
      row.getCell('no').alignment = { horizontal: 'center' };
      if (idx % 2 === 1) altRow(row, 'FFF1F2');
    });

    // Total
    const tDetail = wsDetail.addRow({ no: '', tgl: '', kat: 'TOTAL', nominal: totalAmount, kasir: '', ket: `${expenses.length} pos pengeluaran` });
    tDetail.eachCell({ includeEmpty: false }, (cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
    });
    tDetail.getCell('nominal').numFmt = '#,##0';
    tDetail.getCell('nominal').alignment = { horizontal: 'right' };

    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Laporan-Pengeluaran-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Export Excel Pengeluaran Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
