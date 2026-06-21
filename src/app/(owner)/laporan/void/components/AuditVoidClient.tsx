'use client';

import React, { useState, useMemo } from 'react';
import { ShieldAlert, AlertCircle, Download, Calendar as CalendarIcon, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import Pagination from '@/components/ui/Pagination';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

interface AuditVoidClientProps {
  voidLogs: any[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
  limit: number;
}

export default function AuditVoidClient({ voidLogs, totalPages, totalCount, currentPage, limit }: AuditVoidClientProps) {
  const [filterReason, setFilterReason] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filtering Logic
  const filteredLogs = useMemo(() => {
    return voidLogs.filter((log) => {
      // 1. Filter By Reason
      if (filterReason !== 'ALL' && log.reason !== filterReason) {
        return false;
      }
      
      // 2. Filter By Date Range
      const logDate = new Date(log.date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) return false;
      }

      return true;
    });
  }, [voidLogs, filterReason, startDate, endDate]);

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) return;

    // Persiapkan data
    const exportData = filteredLogs.map((log) => ({
      'Waktu Void': formatDate(log.date),
      'No. Transaksi': log.transaction.receiptNumber,
      'Alasan': log.reason.replace('_', ' '),
      'Keterangan': log.notes || '-',
      'Kasir / Supervisor': log.employeeId || 'Unknown',
      'Nilai Transaksi': log.transaction.totalAmount,
      'Item Dibatalkan': log.transaction.details.map((d: any) => `${d.product.name} (${d.quantity}x)`).join(', ')
    }));

    // Generate Excel
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Void');

    // Tentukan lebar kolom agar rapi
    const wscols = [
      { wch: 20 }, // Waktu Void
      { wch: 25 }, // No Transaksi
      { wch: 20 }, // Alasan
      { wch: 30 }, // Keterangan
      { wch: 20 }, // Kasir
      { wch: 15 }, // Nilai Transaksi
      { wch: 50 }, // Item Dibatalkan
    ];
    worksheet['!cols'] = wscols;

    const fileName = `Laporan_Void_${startDate || 'Semua'}_sd_${endDate || 'Semua'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 h-full bg-background pb-20 md:pb-0">
      <div className="max-w-[1200px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-danger mb-1 flex items-center gap-2">
              <ShieldAlert size={28} /> Audit Pembatalan (Void)
            </h1>
            <p className="text-sm text-text-secondary">
              Pantau dan verifikasi setiap transaksi yang dibatalkan oleh kasir di toko lokal.
            </p>
          </div>
          <button 
            onClick={handleExportExcel}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2 rounded-lg font-bold hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Download size={18} /> Export ke Excel
          </button>
        </div>

        {/* Filter Card */}
        <div className="bg-surface border border-border p-4 rounded-lg flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
              <Filter size={14} /> Filter Alasan
            </label>
            <select 
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-container"
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
            >
              <option value="ALL">Semua Alasan</option>
              <option value="SALAH_INPUT">Salah Input</option>
              <option value="RETUR_PELANGGAN">Retur Pelanggan</option>
              <option value="LAINNYA">Lainnya</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
              <CalendarIcon size={14} /> Tanggal Mulai
            </label>
            <input 
              type="date"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-container"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
              <CalendarIcon size={14} /> Tanggal Akhir
            </label>
            <input 
              type="date"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-container"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Tabel Data */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-surface-container-low border-b border-border">
                <tr>
                  <th className="p-4 text-text-secondary font-medium text-sm w-48">Waktu & Transaksi</th>
                  <th className="p-4 text-text-secondary font-medium text-sm w-48">Alasan</th>
                  <th className="p-4 text-text-secondary font-medium text-sm w-40">Kasir/Supervisor</th>
                  <th className="p-4 text-text-secondary font-medium text-sm text-right w-40">Nilai Pembatalan</th>
                  <th className="p-4 text-text-secondary font-medium text-sm">Item Dikembalikan</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-text-secondary">
                      <AlertCircle size={48} className="mx-auto mb-2 opacity-20" />
                      Belum ada catatan pembatalan (Void) yang tersinkronisasi.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => (
                    <tr key={log.id} className="border-b border-border hover:bg-surface-container-high transition-colors">
                      <td className="p-4 align-top">
                        <div className="font-bold text-text-primary">{log.transaction.receiptNumber}</div>
                        <div className="text-xs text-text-secondary">{formatDate(log.date)}</div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="inline-block px-2 py-1 rounded bg-danger/10 text-danger border border-danger/30 text-[11px] font-bold mb-1">
                          {log.reason.replace('_', ' ')}
                        </div>
                        {log.notes && (
                          <p className="text-xs text-text-secondary italic">"{log.notes}"</p>
                        )}
                      </td>
                      <td className="p-4 font-medium text-text-primary align-top">
                        {log.employeeId || 'Unknown'}
                      </td>
                      <td className="p-4 text-right font-bold text-danger align-top">
                        {formatRp(log.transaction.totalAmount)}
                      </td>
                      <td className="p-4 text-xs text-text-secondary align-top">
                        <ul className="list-disc pl-4 space-y-1">
                          {log.transaction.details.map((d: any) => (
                            <li key={d.id}>
                              {d.product.name} ({d.quantity}x)
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination 
            totalPages={totalPages} 
            totalItems={totalCount} 
            currentPage={currentPage} 
            pageSize={limit} 
          />
        </div>

      </div>
    </div>
  );
}
