'use client';

import React, { useState } from 'react';

import { Search, Filter, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function RekapClient({ initialReports }: { initialReports: any[] }) {
  const [reports, setReports] = useState(initialReports);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter(r => 
    r.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.shift?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl p-4 flex gap-6 text-sm mb-6">
        <span className="font-medium text-text-primary">Panduan warna:</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-text-secondary"><span className="w-3 h-3 rounded-full bg-success"></span> Uang pas / lebih</span>
          <span className="flex items-center gap-2 text-text-secondary"><span className="w-3 h-3 rounded-full bg-danger"></span> Uang kurang dari catatan sistem</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            placeholder="Cari nama kasir atau shift..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface-bright text-sm font-medium text-text-secondary">
            <Filter className="w-4 h-4" />
            Filter Status
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <div key={report.id} className={`bg-surface rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
            report.variance < 0 ? 'border-danger/50 ring-1 ring-danger/20' : 
            report.variance > 0 ? 'border-warning/50 ring-1 ring-warning/20' : 
            'border-success/50 ring-1 ring-success/20'
          }`}>
            <div className={`h-1.5 w-full ${
              report.variance < 0 ? 'bg-danger' : 
              report.variance > 0 ? 'bg-warning' : 
              'bg-success'
            }`} />
            
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-text-primary">{report.employee.name}</h3>
                  <p className="text-sm text-text-secondary">
                    {report.shift ? report.shift.name : 'Tanpa Shift'} • {format(new Date(report.endTime), 'dd MMM yyyy, HH:mm', { locale: id })}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${
                  report.variance === 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}>
                  {report.variance === 0 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Penjualan Cash Shift Ini</span>
                  <span className="font-medium text-text-primary">Rp {report.totalSales.toLocaleString('id-ID')}</span>
                </div>
                {(() => {
                  const cicilan = report.systemCash - report.totalSales + report.totalExpense - report.startingCash;
                  if (cicilan > 0) {
                    return (
                      <div className="flex justify-between text-sm text-primary">
                        <span className="text-text-secondary opacity-80">Cicilan Piutang Masuk</span>
                        <span className="font-medium">+ Rp {cicilan.toLocaleString('id-ID')}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="flex justify-between text-sm text-danger">
                  <span className="text-text-secondary opacity-80">Pengeluaran Cash</span>
                  <span className="font-medium">- Rp {report.totalExpense.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm text-primary">
                  <span className="text-text-secondary opacity-80">Uang Awal Laci</span>
                  <span className="font-medium">+ Rp {report.startingCash.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="bg-surface-container-low p-3 rounded-lg space-y-2 mb-4 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-text-secondary">Seharusnya Ada di Laci</span>
                  <span className="font-bold text-text-primary">Rp {report.systemCash.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-text-secondary">Dilaporkan Ada di Laci</span>
                  <span className="font-bold text-primary">Rp {report.actualCash.toLocaleString('id-ID')}</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center mt-2">
                  <span className="font-bold text-text-primary">Selisih</span>
                  <span className={`text-lg font-black ${
                    report.variance === 0 ? 'text-success' : 
                    report.variance < 0 ? 'text-danger' : 'text-warning'
                  }`}>
                    {report.variance > 0 ? '+' : ''}Rp {report.variance.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className={`mt-4 p-3 rounded-lg text-sm border ${
                report.variance === 0 ? 'bg-success/5 border-success/20 text-success' :
                report.variance < 0 ? 'bg-danger/5 border-danger/20 text-danger' :
                'bg-warning/5 border-warning/20 text-warning-container'
              }`}>
                {report.variance === 0 ? (
                  <span>🟢 Uang cocok. Kasir {report.employee.name} selesai shift dengan bersih. {report.notes ? `Catatan: ${report.notes}` : ''}</span>
                ) : report.variance < 0 ? (
                  <span>🔴 Uang kurang Rp {Math.abs(report.variance).toLocaleString('id-ID')} dari yang seharusnya. Alasan kasir: "{report.notes || 'Tidak ada alasan'}"</span>
                ) : (
                  <span>🟡 Uang lebih Rp {report.variance.toLocaleString('id-ID')} dari catatan. Mungkin ada kembalian yang salah hitung. Catatan: "{report.notes || 'Tidak ada alasan'}"</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-secondary bg-surface rounded-xl border border-border border-dashed">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Tidak ada laporan rekap yang ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
