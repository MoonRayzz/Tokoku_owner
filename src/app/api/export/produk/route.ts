import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');

    // Default 1 bulan terakhir jika tidak ada parameter
    const startDate = startParam ? new Date(startParam) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = endParam ? new Date(endParam) : new Date();
    // Sesuaikan endDate hingga akhir hari (23:59:59)
    endDate.setHours(23, 59, 59, 999);

    // 1. Ambil data Master Produk
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    });

    const masterData = products.map((p, index) => ({
      'No': index + 1,
      'SKU': p.sku,
      'Nama Produk': p.name,
      'Stok Saat Ini': p.stock,
      'Harga Beli (HPP)': p.priceBuy || 0,
      'Harga Jual (Retail)': p.priceRetail,
      'Total Aset (HPP x Stok)': (p.priceBuy || 0) * p.stock,
    }));

    // 2. Ambil data Stok Masuk (IN dan CORRECTION > 0)
    const stockInLogs = await prisma.stockLog.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        OR: [
          { type: 'IN' },
          { type: 'VOID_RETURN' },
          { type: 'CORRECTION', amount: { gt: 0 } }
        ]
      },
      include: { product: true },
      orderBy: { date: 'desc' }
    });

    const stockInData = stockInLogs.map((log, index) => ({
      'No': index + 1,
      'Tanggal': new Date(log.date).toLocaleString('id-ID'),
      'SKU': log.product.sku,
      'Nama Produk': log.product.name,
      'Jumlah Masuk': log.amount,
      'Tipe': log.type === 'IN' ? 'Terima PO' : (log.type === 'VOID_RETURN' ? 'Retur Void' : 'Koreksi Plus'),
      'Keterangan': log.notes || '-',
      'User/Kasir': log.employeeId || '-'
    }));

    // 3. Ambil data Stok Keluar (OUT dan CORRECTION < 0)
    const stockOutLogs = await prisma.stockLog.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        OR: [
          { type: 'OUT' },
          { type: 'CORRECTION', amount: { lt: 0 } }
        ]
      },
      include: { product: true },
      orderBy: { date: 'desc' }
    });

    const stockOutData = stockOutLogs.map((log, index) => ({
      'No': index + 1,
      'Tanggal': new Date(log.date).toLocaleString('id-ID'),
      'SKU': log.product.sku,
      'Nama Produk': log.product.name,
      'Jumlah Keluar': Math.abs(log.amount),
      'Tipe': log.type === 'OUT' ? 'Penjualan' : 'Koreksi Minus',
      'Keterangan': log.notes || '-',
      'User/Kasir': log.employeeId || '-'
    }));

    // Generate Excel Workbook
    const wb = xlsx.utils.book_new();

    // Sheet 1: Master Produk
    const wsMaster = xlsx.utils.json_to_sheet(masterData);
    xlsx.utils.book_append_sheet(wb, wsMaster, 'Master Produk & Stok');

    // Sheet 2: Stok Masuk
    const wsIn = xlsx.utils.json_to_sheet(stockInData);
    xlsx.utils.book_append_sheet(wb, wsIn, 'Riwayat Stok Masuk');

    // Sheet 3: Stok Keluar
    const wsOut = xlsx.utils.json_to_sheet(stockOutData);
    xlsx.utils.book_append_sheet(wb, wsOut, 'Riwayat Stok Keluar');

    // Menyesuaikan lebar kolom secara otomatis (sederhana)
    const setColWidth = (ws: xlsx.WorkSheet, data: any[]) => {
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, ...data.map(row => String(row[key as keyof typeof row] || '').length)) + 2
      }));
      ws['!cols'] = colWidths;
    };

    if (masterData.length > 0) setColWidth(wsMaster, masterData);
    if (stockInData.length > 0) setColWidth(wsIn, stockInData);
    if (stockOutData.length > 0) setColWidth(wsOut, stockOutData);

    // Convert to Buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return file as Response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Laporan_Produk_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
