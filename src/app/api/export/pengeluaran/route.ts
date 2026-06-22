import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const expenses = await prisma.expense.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        isVoid: false
      },
      orderBy: { date: 'desc' },
      include: { employee: true }
    });

    const data = expenses.map(e => ({
      'Tanggal': new Date(e.date).toLocaleString('id-ID'),
      'Kategori': e.category,
      'Keterangan': e.notes || '-',
      'Nominal (Rp)': e.amount,
      'Dibuat Oleh': e.employee?.name || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pengeluaran");

    // Tentukan lebar kolom
    ws['!cols'] = [
      { wch: 20 }, // Tanggal
      { wch: 20 }, // Kategori
      { wch: 30 }, // Keterangan
      { wch: 15 }, // Nominal
      { wch: 20 }, // Dibuat Oleh
    ];

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Export_Pengeluaran_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Export Excel Pengeluaran Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
