import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const whereClause: any = {};
    if (status && status !== 'ALL') whereClause.status = status;
    if (search) whereClause.debtorName = { contains: search, mode: 'insensitive' };

    const debts = await prisma.debt.findMany({
      where: whereClause,
      include: {
        transaction: { include: { details: { include: { product: true } } } },
        payments: { orderBy: { paidAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ─── KALKULASI RINGKASAN ────────────────────────────────────────────────
    const totalUtang       = debts.reduce((s, d) => s + d.totalAmount, 0);
    const totalTerbayar    = debts.reduce((s, d) => s + d.paidAmount,  0);
    const totalSisa        = debts.reduce((s, d) => s + d.remaining,   0);
    const countLunas       = debts.filter(d => d.status === 'PAID').length;
    const countDicicil     = debts.filter(d => d.status === 'PARTIAL').length;
    const countBelumLunas  = debts.filter(d => d.status === 'UNPAID').length;

    const ExcelJS = await import('exceljs');
    const wb      = new ExcelJS.Workbook();
    wb.creator    = 'TokoKu Owner Dashboard';
    wb.created    = new Date();

    const RED      = 'EF4444';
    const NAVY     = '1E3A5F';
    const GOLD     = 'D97706';
    const GREEN_DK = '065F46';
    const GRAY_HD  = 'E5E7EB';
    const GRAY_BG  = 'F9FAFB';

    const styleHeader = (row: any, bgArgb: string) => {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bgArgb}` } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border    = { bottom: { style: 'medium', color: { argb: `FF${bgArgb}` } } };
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

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 1 — RINGKASAN PIUTANG
    // ════════════════════════════════════════════════════════════════════════
    const wsRing = wb.addWorksheet('Ringkasan Piutang');
    wsRing.getColumn(1).width = 36;
    wsRing.getColumn(2).width = 22;

    let r = 1;

    // Judul
    wsRing.mergeCells(r, 1, r, 3);
    const t1 = wsRing.getRow(r);
    t1.getCell(1).value = '📋 LAPORAN BUKU PIUTANG (UTANG) — TokoKu';
    t1.getCell(1).font  = { bold: true, size: 15, color: { argb: `FF${NAVY}` } };
    t1.getCell(1).alignment = { horizontal: 'center' };
    t1.height = 28; r++;

    wsRing.mergeCells(r, 1, r, 3);
    const t2 = wsRing.getRow(r);
    t2.getCell(1).value = `Diekspor: ${new Date().toLocaleString('id-ID')}  |  Filter Status: ${status || 'SEMUA'}`;
    t2.getCell(1).font  = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
    t2.getCell(1).alignment = { horizontal: 'center' };
    r += 2;

    const addKV = (label: string, value: any, numFmt = '#,##0', boldValue = false, highlight = false) => {
      const row = wsRing.getRow(r);
      row.getCell(1).value = `  ${label}`;
      row.getCell(1).font  = { size: 10, color: { argb: 'FF374151' } };
      row.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: highlight ? 'FFD1FAE5' : `FF${GRAY_BG}` } };
      const vc = row.getCell(2);
      vc.value = value; vc.numFmt = numFmt;
      vc.font  = boldValue ? { bold: true, size: 11 } : { size: 10 };
      vc.alignment = { horizontal: 'right' };
      vc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: highlight ? 'FFD1FAE5' : `FF${GRAY_BG}` } };
      row.height = 18; r++;
    };

    const addSecHeader = (title: string) => {
      wsRing.mergeCells(r, 1, r, 3);
      const row = wsRing.getRow(r);
      row.getCell(1).value = `  ${title}`;
      row.getCell(1).font  = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      row.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
      row.height = 22; r++;
    };

    addSecHeader('💰 TOTAL PIUTANG');
    addKV('Total Nilai Piutang', totalUtang, '#,##0', true);
    addKV('Total Sudah Dibayar', totalTerbayar);
    addKV('SISA PIUTANG AKTIF', totalSisa, '#,##0', true, true);
    r++;

    addSecHeader('📊 STATUS PIUTANG');
    addKV('Jumlah Debitur Total', debts.length, '0 "orang/nota"');
    addKV('LUNAS (PAID)', countLunas, '0 "nota"');
    addKV('Dicicil (PARTIAL)', countDicicil, '0 "nota"');
    addKV('Belum Lunas (UNPAID)', countBelumLunas, '0 "nota"', true);
    r++;

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 2 — DAFTAR PIUTANG
    // ════════════════════════════════════════════════════════════════════════
    const wsList = wb.addWorksheet('Daftar Piutang');
    wsList.columns = [
      { header: 'No.',               key: 'no',      width: 6  },
      { header: 'Tanggal',           key: 'tgl',     width: 20 },
      { header: 'Nama Pelanggan',    key: 'nama',    width: 26 },
      { header: 'No. HP',            key: 'hp',      width: 16 },
      { header: 'No. Transaksi',     key: 'nota',    width: 26 },
      { header: 'Nilai Utang (Rp)',  key: 'total',   width: 18 },
      { header: 'Sudah Bayar (Rp)', key: 'bayar',   width: 18 },
      { header: 'Sisa Utang (Rp)',   key: 'sisa',    width: 18 },
      { header: 'Status',            key: 'status',  width: 14 },
      { header: 'Jml Cicilan',       key: 'cicilan', width: 14 },
      { header: 'Cicilan Terakhir',  key: 'lastpay', width: 20 },
      { header: 'Catatan',           key: 'notes',   width: 36 },
    ];
    styleHeader(wsList.getRow(1), NAVY);
    wsList.views = [{ state: 'frozen', ySplit: 1 }];
    wsList.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 12 } };

    debts.forEach((d, idx) => {
      const lastPayment = d.payments.length > 0 ? d.payments[d.payments.length - 1] : null;
      const statusLabel = d.status === 'PAID' ? '✅ LUNAS' : d.status === 'PARTIAL' ? '⏳ DICICIL' : '❌ BELUM';

      const row = wsList.addRow({
        no:      idx + 1,
        tgl:     format(d.createdAt, 'yyyy-MM-dd HH:mm'),
        nama:    d.debtorName,
        hp:      d.debtorPhone || '-',
        nota:    d.transaction?.receiptNumber || '-',
        total:   d.totalAmount,
        bayar:   d.paidAmount,
        sisa:    d.remaining,
        status:  statusLabel,
        cicilan: d.payments.length,
        lastpay: lastPayment ? format(lastPayment.paidAt, 'yyyy-MM-dd') : '-',
        notes:   d.debtorNotes || '-',
      });

      ['total','bayar','sisa'].forEach(k => {
        row.getCell(k).numFmt = '#,##0';
        row.getCell(k).alignment = { horizontal: 'right' };
      });
      row.getCell('no').alignment = { horizontal: 'center' };
      row.getCell('cicilan').alignment = { horizontal: 'center' };

      if (d.status === 'PAID') {
        row.getCell('status').font = { color: { argb: `FF${GREEN_DK}` }, bold: true };
      } else if (d.status === 'PARTIAL') {
        row.getCell('status').font = { color: { argb: `FF${GOLD}` }, bold: true };
      } else {
        row.getCell('status').font = { color: { argb: `FF${RED}` }, bold: true };
        row.getCell('sisa').font   = { bold: true, color: { argb: `FF${RED}` } };
      }
      if (idx % 2 === 1) altRow(row, 'FFF7ED');
    });

    // Total row
    const tList = wsList.addRow({
      no: '', tgl: '', nama: 'TOTAL', hp: '', nota: '',
      total: totalUtang, bayar: totalTerbayar, sisa: totalSisa,
      status: '', cicilan: debts.reduce((s, d) => s + d.payments.length, 0), lastpay: '', notes: ''
    });
    tList.eachCell({ includeEmpty: false }, (cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    });
    ['total','bayar','sisa'].forEach(k => { tList.getCell(k).numFmt = '#,##0'; tList.getCell(k).alignment = { horizontal: 'right' }; });

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 3 — RIWAYAT CICILAN
    // ════════════════════════════════════════════════════════════════════════
    const wsCicil = wb.addWorksheet('Riwayat Cicilan');
    wsCicil.columns = [
      { header: 'Tanggal Cicilan',   key: 'tgl',   width: 20 },
      { header: 'Nama Debitur',      key: 'nama',  width: 26 },
      { header: 'No. Transaksi Asal', key: 'nota', width: 26 },
      { header: 'Jumlah Cicilan (Rp)', key: 'jml', width: 20 },
      { header: 'Diterima Oleh (Kasir)', key: 'kasir', width: 22 },
      { header: 'Catatan',           key: 'notes', width: 36 },
    ];
    styleHeader(wsCicil.getRow(1), GOLD);
    wsCicil.views = [{ state: 'frozen', ySplit: 1 }];

    let allPayments: any[] = [];
    debts.forEach(d => {
      d.payments.forEach(p => {
        allPayments.push({ debt: d, payment: p });
      });
    });
    allPayments.sort((a, b) => new Date(b.payment.paidAt).getTime() - new Date(a.payment.paidAt).getTime());

    allPayments.forEach(({ debt: d, payment: p }, idx) => {
      const row = wsCicil.addRow({
        tgl:   format(p.paidAt, 'yyyy-MM-dd HH:mm'),
        nama:  d.debtorName,
        nota:  d.transaction?.receiptNumber || '-',
        jml:   p.amount,
        kasir: p.kasirId || '-',
        notes: p.notes || '-',
      });
      row.getCell('jml').numFmt   = '#,##0';
      row.getCell('jml').alignment = { horizontal: 'right' };
      if (idx % 2 === 1) altRow(row, 'FFFEF3C7');
    });

    // Total cicilan
    const tCicil = wsCicil.addRow({
      tgl: '', nama: 'TOTAL CICILAN DITERIMA', nota: '', jml: totalTerbayar, kasir: '', notes: `${allPayments.length} pos cicilan`
    });
    tCicil.eachCell({ includeEmpty: false }, (cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    });
    tCicil.getCell('jml').numFmt = '#,##0';
    tCicil.getCell('jml').alignment = { horizontal: 'right' };

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Laporan-Piutang-${format(new Date(), 'yyyy-MM-dd')}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    console.error('Error exporting buku utang:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
