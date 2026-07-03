import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('startDate');
    const endParam   = searchParams.get('endDate');

    const startDate = startParam ? new Date(startParam) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate   = endParam   ? new Date(endParam)   : new Date();
    endDate.setHours(23, 59, 59, 999);

    // ─── DATA FETCHING ─────────────────────────────────────────────────────
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });

    const stockLogs = await prisma.stockLog.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: {
        product: true,
      },
      orderBy: { date: 'desc' },
    });

    // ─── KALKULASI PER PRODUK ───────────────────────────────────────────────
    const prodMap = new Map<string, { masuk: number; keluar: number; nilaiMasuk: number; nilaiKeluar: number }>();
    stockLogs.forEach(log => {
      const existing = prodMap.get(log.productId) || { masuk: 0, keluar: 0, nilaiMasuk: 0, nilaiKeluar: 0 };
      const qty = log.amount;
      const isIn = qty > 0 || log.type === 'IN' || log.type === 'VOID_RETURN' || (log.type === 'CORRECTION' && qty > 0);
      if (isIn) {
        existing.masuk += Math.abs(qty);
        existing.nilaiMasuk += Math.abs(qty) * (log.product.priceBuy || 0);
      } else {
        existing.keluar += Math.abs(qty);
        existing.nilaiKeluar += Math.abs(qty) * (log.product.priceRetail);
      }
      prodMap.set(log.productId, existing);
    });

    const totalNilaiInventaris = products.reduce((s, p) => s + (p.priceBuy || 0) * p.stock, 0);
    const totalStokSemua = products.reduce((s, p) => s + p.stock, 0);
    const lowStock  = products.filter(p => p.stock > 0 && p.stock <= p.minStockAlert);
    const emptyStock = products.filter(p => p.stock === 0);

    const ExcelJS = await import('exceljs');
    const wb      = new ExcelJS.Workbook();
    wb.creator    = 'TokoKu Owner Dashboard';
    wb.created    = new Date();

    const NAVY     = '1E3A5F';
    const EMERALD  = '10B981';
    const RED      = 'EF4444';
    const GOLD     = 'D97706';
    const GRAY_HD  = 'E5E7EB';
    const GRAY_BG  = 'F9FAFB';
    const GREEN_DK = '065F46';

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

    const periodeLabel = `${startParam || 'awal'} s/d ${endParam || new Date().toISOString().split('T')[0]}`;

    // ══════════════════════════════════════════════════════════════════════════
    // SHEET 1 — RINGKASAN INVENTARIS
    // ══════════════════════════════════════════════════════════════════════════
    const wsRing = wb.addWorksheet('Ringkasan Inventaris');
    wsRing.getColumn(1).width = 38;
    wsRing.getColumn(2).width = 22;

    let r = 1;
    wsRing.mergeCells(r, 1, r, 3);
    const t1 = wsRing.getRow(r);
    t1.getCell(1).value = '📦 LAPORAN INVENTARIS & STOK — TokoKu';
    t1.getCell(1).font  = { bold: true, size: 15, color: { argb: `FF${NAVY}` } };
    t1.getCell(1).alignment = { horizontal: 'center' };
    t1.height = 28; r++;

    wsRing.mergeCells(r, 1, r, 3);
    const t2 = wsRing.getRow(r);
    t2.getCell(1).value = `Periode Pergerakan: ${periodeLabel}  |  Diekspor: ${new Date().toLocaleString('id-ID')}`;
    t2.getCell(1).font  = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
    t2.getCell(1).alignment = { horizontal: 'center' };
    r += 2;

    const addSecHeader = (title: string) => {
      wsRing.mergeCells(r, 1, r, 3);
      const row = wsRing.getRow(r);
      row.getCell(1).value = `  ${title}`;
      row.getCell(1).font  = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      row.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
      row.height = 22; r++;
    };

    const addKV = (label: string, value: any, numFmt = '#,##0', warn = false) => {
      const row = wsRing.getRow(r);
      row.getCell(1).value = `  ${label}`;
      row.getCell(1).font  = { size: 10, color: { argb: 'FF374151' } };
      row.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: warn ? 'FFFEF2F2' : `FF${GRAY_BG}` } };
      const vc = row.getCell(2);
      vc.value = value; vc.numFmt = numFmt;
      vc.font  = warn ? { bold: true, color: { argb: `FF${RED}` } } : { size: 10 };
      vc.alignment = { horizontal: 'right' };
      vc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: warn ? 'FFFEF2F2' : `FF${GRAY_BG}` } };
      row.height = 18; r++;
    };

    addSecHeader('📊 KONDISI STOK SAAT INI');
    addKV('Total SKU / Jenis Produk', products.length, '0 "produk"');
    addKV('Total Unit Stok Tersedia', totalStokSemua, '#,##0 "unit"');
    addKV('Nilai Inventaris (HPP × Stok)', totalNilaiInventaris);
    addKV('Produk Stok Menipis', lowStock.length, '0 "produk"', lowStock.length > 0);
    addKV('Produk Stok Habis (0)', emptyStock.length, '0 "produk"', emptyStock.length > 0);
    r++;

    // Daftar produk stok menipis
    if (lowStock.length > 0) {
      addSecHeader(`⚠️ PRODUK STOK MENIPIS (${lowStock.length} produk)`);
      lowStock.forEach(p => {
        const row = wsRing.getRow(r);
        row.getCell(1).value = `  ${p.name} (${p.sku})`;
        row.getCell(1).font  = { color: { argb: `FF${GOLD}` } };
        row.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        row.getCell(2).value = `Stok: ${p.stock} / Min: ${p.minStockAlert}`;
        row.getCell(2).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        row.getCell(2).font  = { bold: true, color: { argb: `FF${GOLD}` } };
        row.height = 18; r++;
      });
      r++;
    }

    if (emptyStock.length > 0) {
      addSecHeader(`🚫 PRODUK STOK HABIS (${emptyStock.length} produk)`);
      emptyStock.forEach(p => {
        const row = wsRing.getRow(r);
        row.getCell(1).value = `  ${p.name} (${p.sku})`;
        row.getCell(1).font  = { color: { argb: `FF${RED}` } };
        row.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        row.getCell(2).value = `Harga: Rp ${p.priceRetail.toLocaleString('id-ID')}`;
        row.getCell(2).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        row.getCell(2).font  = { bold: true, color: { argb: `FF${RED}` } };
        row.height = 18; r++;
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SHEET 2 — MASTER PRODUK
    // ══════════════════════════════════════════════════════════════════════════
    const wsMaster = wb.addWorksheet('Master Produk');
    wsMaster.columns = [
      { header: 'No.',                key: 'no',     width: 6  },
      { header: 'SKU',                key: 'sku',    width: 18 },
      { header: 'Nama Produk',        key: 'name',   width: 34 },
      { header: 'Barcode',            key: 'barcode',width: 18 },
      { header: 'Stok Saat Ini',      key: 'stok',   width: 14 },
      { header: 'Min Alert',          key: 'min',    width: 12 },
      { header: 'Status Stok',        key: 'status', width: 16 },
      { header: 'HPP / Beli (Rp)',    key: 'hpp',    width: 18 },
      { header: 'Harga Ecer (Rp)',    key: 'ecer',   width: 18 },
      { header: 'Harga Grosir (Rp)', key: 'grosir', width: 18 },
      { header: 'Min Qty Grosir',     key: 'minqty', width: 16 },
      { header: 'Nilai Aset (Rp)',    key: 'aset',   width: 20 },
    ];
    styleHeader(wsMaster.getRow(1), NAVY);
    wsMaster.views = [{ state: 'frozen', ySplit: 1 }];
    wsMaster.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 12 } };

    products.forEach((p, idx) => {
      const isLow   = p.stock > 0 && p.stock <= p.minStockAlert;
      const isEmpty = p.stock === 0;
      const status  = isEmpty ? '🚫 Habis' : isLow ? '⚠️ Menipis' : '✅ Normal';
      const row = wsMaster.addRow({
        no:      idx + 1,
        sku:     p.sku,
        name:    p.name,
        barcode: (p as any).barcode || '-',
        stok:    p.stock,
        min:     p.minStockAlert,
        status,
        hpp:     p.priceBuy || 0,
        ecer:    p.priceRetail,
        grosir:  p.priceWholesale || '-',
        minqty:  p.wholesaleMinQty || '-',
        aset:    (p.priceBuy || 0) * p.stock,
      });
      ['hpp','ecer','aset'].forEach(k => { row.getCell(k).numFmt = '#,##0'; row.getCell(k).alignment = { horizontal: 'right' }; });
      ['stok','min','minqty'].forEach(k => row.getCell(k).alignment = { horizontal: 'center' });
      row.getCell('no').alignment = { horizontal: 'center' };
      if (p.priceWholesale) { row.getCell('grosir').numFmt = '#,##0'; row.getCell('grosir').alignment = { horizontal: 'right' }; }
      if (isEmpty) {
        row.getCell('stok').font = { bold: true, color: { argb: `FF${RED}` } };
        row.getCell('status').font = { color: { argb: `FF${RED}` } };
      } else if (isLow) {
        row.getCell('stok').font = { bold: true, color: { argb: `FF${GOLD}` } };
        row.getCell('status').font = { color: { argb: `FF${GOLD}` } };
      }
      if (idx % 2 === 1) altRow(row, 'F0FDF4');
    });

    // Total
    const tMaster = wsMaster.addRow({
      no: '', sku: '', name: 'TOTAL', barcode: '', stok: totalStokSemua, min: '', status: '',
      hpp: '', ecer: '', grosir: '', minqty: '', aset: totalNilaiInventaris
    });
    tMaster.eachCell({ includeEmpty: false }, (cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    });
    tMaster.getCell('aset').numFmt = '#,##0'; tMaster.getCell('aset').alignment = { horizontal: 'right' };
    tMaster.getCell('stok').alignment = { horizontal: 'center' };

    // ══════════════════════════════════════════════════════════════════════════
    // SHEET 3 — RIWAYAT STOK MASUK
    // ══════════════════════════════════════════════════════════════════════════
    const stockInLogs = stockLogs.filter(l =>
      l.amount > 0 || l.type === 'IN' || l.type === 'VOID_RETURN' || (l.type === 'CORRECTION' && l.amount > 0)
    );

    const wsIn = wb.addWorksheet('Stok Masuk');
    wsIn.columns = [
      { header: 'No.',             key: 'no',    width: 6  },
      { header: 'Tanggal',         key: 'tgl',   width: 22 },
      { header: 'SKU',             key: 'sku',   width: 16 },
      { header: 'Nama Produk',     key: 'name',  width: 34 },
      { header: 'Jenis',           key: 'type',  width: 18 },
      { header: 'Qty Masuk',       key: 'qty',   width: 12 },
      { header: 'HPP Saat Itu (Rp)', key: 'hpp', width: 18 },
      { header: 'Nilai Masuk (Rp)', key: 'nilai',width: 18 },
      { header: 'PIC / Kasir',     key: 'pic',   width: 20 },
      { header: 'Keterangan',      key: 'ket',   width: 40 },
    ];
    styleHeader(wsIn.getRow(1), EMERALD);
    wsIn.views = [{ state: 'frozen', ySplit: 1 }];
    wsIn.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } };

    const typeLabel = (t: string, amount: number) => {
      if (t === 'IN') return 'Terima PO';
      if (t === 'VOID_RETURN') return 'Retur Void';
      if (t === 'CORRECTION' && amount > 0) return 'Koreksi +';
      return t;
    };

    stockInLogs.forEach((log, idx) => {
      const hppSaat = log.product.priceBuy || 0;
      const nilaiMasuk = Math.abs(log.amount) * hppSaat;
      const row = wsIn.addRow({
        no:    idx + 1,
        tgl:   new Date(log.date).toLocaleString('id-ID'),
        sku:   log.product.sku,
        name:  log.product.name,
        type:  typeLabel(log.type, log.amount),
        qty:   Math.abs(log.amount),
        hpp:   hppSaat,
        nilai: nilaiMasuk,
        pic:   log.employeeId || '-',
        ket:   log.notes || '-',
      });
      ['hpp','nilai'].forEach(k => { row.getCell(k).numFmt = '#,##0'; row.getCell(k).alignment = { horizontal: 'right' }; });
      ['qty','no'].forEach(k => row.getCell(k).alignment = { horizontal: 'center' });
      if (log.type === 'VOID_RETURN') row.getCell('type').font = { color: { argb: `FF${GOLD}` } };
      if (idx % 2 === 1) altRow(row, 'F0FDF4');
    });

    const totalQtyMasuk = stockInLogs.reduce((s, l) => s + Math.abs(l.amount), 0);
    const totalNilaiMasuk = stockInLogs.reduce((s, l) => s + Math.abs(l.amount) * (l.product.priceBuy || 0), 0);
    const tIn = wsIn.addRow({ no: '', tgl: '', sku: '', name: 'TOTAL', type: '', qty: totalQtyMasuk, hpp: '', nilai: totalNilaiMasuk, pic: '', ket: `${stockInLogs.length} pergerakan` });
    tIn.eachCell({ includeEmpty: false }, (cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    });
    ['nilai'].forEach(k => { tIn.getCell(k).numFmt = '#,##0'; tIn.getCell(k).alignment = { horizontal: 'right' }; });
    tIn.getCell('qty').alignment = { horizontal: 'center' };

    // ══════════════════════════════════════════════════════════════════════════
    // SHEET 4 — RIWAYAT STOK KELUAR
    // ══════════════════════════════════════════════════════════════════════════
    const stockOutLogs = stockLogs.filter(l =>
      l.amount < 0 || l.type === 'OUT' || (l.type === 'CORRECTION' && l.amount < 0)
    );

    const wsOut = wb.addWorksheet('Stok Keluar');
    wsOut.columns = [
      { header: 'No.',             key: 'no',    width: 6  },
      { header: 'Tanggal',         key: 'tgl',   width: 22 },
      { header: 'SKU',             key: 'sku',   width: 16 },
      { header: 'Nama Produk',     key: 'name',  width: 34 },
      { header: 'Jenis',           key: 'type',  width: 18 },
      { header: 'Qty Keluar',      key: 'qty',   width: 12 },
      { header: 'Harga Jual (Rp)', key: 'jual',  width: 18 },
      { header: 'Nilai Keluar (Rp)', key: 'nilai',width: 20 },
      { header: 'PIC / Kasir',     key: 'pic',   width: 20 },
      { header: 'Keterangan',      key: 'ket',   width: 40 },
    ];
    styleHeader(wsOut.getRow(1), RED);
    wsOut.views = [{ state: 'frozen', ySplit: 1 }];
    wsOut.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } };

    const typeOutLabel = (t: string, amount: number) => {
      if (t === 'OUT') return 'Penjualan';
      if (t === 'CORRECTION' && amount < 0) return 'Koreksi -';
      return t;
    };

    stockOutLogs.forEach((log, idx) => {
      const nilaiKeluar = Math.abs(log.amount) * log.product.priceRetail;
      const row = wsOut.addRow({
        no:    idx + 1,
        tgl:   new Date(log.date).toLocaleString('id-ID'),
        sku:   log.product.sku,
        name:  log.product.name,
        type:  typeOutLabel(log.type, log.amount),
        qty:   Math.abs(log.amount),
        jual:  log.product.priceRetail,
        nilai: nilaiKeluar,
        pic:   log.employeeId || '-',
        ket:   log.notes || '-',
      });
      ['jual','nilai'].forEach(k => { row.getCell(k).numFmt = '#,##0'; row.getCell(k).alignment = { horizontal: 'right' }; });
      ['qty','no'].forEach(k => row.getCell(k).alignment = { horizontal: 'center' });
      if (idx % 2 === 1) altRow(row, 'FFF1F2');
    });

    const totalQtyKeluar   = stockOutLogs.reduce((s, l) => s + Math.abs(l.amount), 0);
    const totalNilaiKeluar = stockOutLogs.reduce((s, l) => s + Math.abs(l.amount) * l.product.priceRetail, 0);
    const tOut = wsOut.addRow({ no: '', tgl: '', sku: '', name: 'TOTAL', type: '', qty: totalQtyKeluar, jual: '', nilai: totalNilaiKeluar, pic: '', ket: `${stockOutLogs.length} pergerakan` });
    tOut.eachCell({ includeEmpty: false }, (cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
    });
    ['nilai'].forEach(k => { tOut.getCell(k).numFmt = '#,##0'; tOut.getCell(k).alignment = { horizontal: 'right' }; });
    tOut.getCell('qty').alignment = { horizontal: 'center' };

    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Laporan-Inventaris-${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

  } catch (error) {
    console.error('Export inventaris error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
