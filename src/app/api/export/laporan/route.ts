import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'excel'; // excel atau pdf
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const shiftParam = searchParams.get('shift');

  const todayStr = new Date().toISOString().split('T')[0];
  const start = startParam ? new Date(`${startParam}T00:00:00.000Z`) : new Date(`${todayStr}T00:00:00.000Z`);
  const end = endParam ? new Date(`${endParam}T23:59:59.999Z`) : new Date(`${todayStr}T23:59:59.999Z`);

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

  const rows = transactions.map(t => ({
    'No. Nota': t.receiptNumber,
    'Waktu': new Date(t.createdAt).toLocaleString('id-ID'),
    'Member': t.member?.name ?? '-',
    'Kasir': t.cashierName,
    'Metode Bayar': t.paymentMethod,
    'Total (Rp)': t.totalAmount,
  }));

  if (type === 'excel') {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan-${startParam || 'today'}-${endParam || 'today'}.xlsx"`,
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
      t.totalAmount.toLocaleString('id-ID')
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
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
