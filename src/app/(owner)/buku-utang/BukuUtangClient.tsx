'use client'

import React, { useState } from 'react';

const formatRp = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

export default function BukuUtangClient({ initialDebts }: { initialDebts: any[] }) {
  const [debts, setDebts] = useState(initialDebts);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting & Filtering
  const filteredDebts = debts.filter((d: any) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (searchQuery && !d.debtorName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const sortedDebts = [...filteredDebts].sort((a, b) => {
    if (a.status !== 'PAID' && b.status === 'PAID') return -1;
    if (a.status === 'PAID' && b.status !== 'PAID') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 h-full bg-background pb-20 md:pb-0">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary-container mb-1">Laporan Buku Utang</h1>
            <p className="text-sm text-text-secondary">Lihat semua catatan piutang dan riwayat pembayaran pelanggan.</p>
          </div>
          <div className="bg-rose-500/10 text-rose-500 px-4 py-2 rounded-xl border border-rose-500/20 font-bold">
            Total Piutang Berjalan: {formatRp(debts.reduce((sum: number, d: any) => sum + d.remaining, 0))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface p-4 rounded-xl border border-border">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Cari nama pelanggan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="UNPAID">Belum Lunas</option>
              <option value="PARTIAL">Dicicil</option>
              <option value="PAID">Lunas</option>
            </select>
          </div>
          <a 
            href={`/api/export/buku-utang?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`}
            target="_blank"
            className="flex items-center gap-2 bg-success/10 text-success border border-success/20 px-4 py-2 rounded-lg text-sm font-bold hover:bg-success/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Excel
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface rounded-xl border border-border overflow-hidden flex flex-col h-[70vh]">
            <div className="p-4 border-b border-border bg-surface-container-low font-bold">Daftar Utang Pelanggan</div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-border text-xs uppercase text-text-secondary sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Pelanggan</th>
                    <th className="px-4 py-3">No. Trx</th>
                    <th className="px-4 py-3 text-right">Utang Awal</th>
                    <th className="px-4 py-3 text-right">Sisa Utang</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedDebts.map((d: any) => (
                    <tr 
                      key={d.id} 
                      onClick={() => setSelectedDebt(d)}
                      className={`hover:bg-surface-container-high transition-colors cursor-pointer ${selectedDebt?.id === d.id ? 'bg-surface-container-highest' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm">{new Date(d.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3 font-medium">
                        {d.debtorName}
                        <div className="text-xs text-text-secondary font-normal">{d.debtorPhone || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-text-secondary">{d.transaction?.receiptNumber || '-'}</td>
                      <td className="px-4 py-3 text-right text-sm">{formatRp(d.totalAmount)}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-500">{formatRp(d.remaining)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                          d.status === 'PAID' ? 'bg-success/20 text-success' : 
                          d.status === 'PARTIAL' ? 'bg-amber-500/20 text-amber-500' : 'bg-rose-500/20 text-rose-500'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sortedDebts.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-text-secondary">Tidak ada data sesuai filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            {selectedDebt ? (
              <div className="bg-surface rounded-xl border border-border p-5 sticky top-4 shadow-sm">
                <h2 className="font-bold text-lg mb-4">Detail Utang</h2>
                
                <div className="bg-surface-container-low p-4 rounded-lg mb-4 text-sm space-y-3">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-secondary">Pelanggan:</span>
                    <span className="font-bold">{selectedDebt.debtorName}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-secondary">No. HP:</span>
                    <span>{selectedDebt.debtorPhone || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-secondary">Total Utang Awal:</span>
                    <span className="font-bold">{formatRp(selectedDebt.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-secondary">Sisa Utang:</span>
                    <span className="font-bold text-rose-500">{formatRp(selectedDebt.remaining)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Catatan:</span>
                    <span className="text-right">{selectedDebt.debtorNotes || '-'}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <h3 className="text-sm font-bold text-text-primary mb-3">Riwayat Pembayaran Cicilan</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {(!selectedDebt.payments || selectedDebt.payments.length === 0) ? (
                      <div className="text-xs text-text-secondary text-center py-4 bg-surface-container-low rounded">Belum ada cicilan.</div>
                    ) : (
                      [...selectedDebt.payments]
                        .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
                        .map((p: any) => (
                          <div key={p.id} className="text-sm bg-surface-container-low p-3 rounded flex justify-between items-center border-l-4 border-success">
                            <div>
                              <div className="font-bold">{formatRp(p.amount)}</div>
                              <div className="text-[11px] text-text-secondary mt-0.5">
                                {new Date(p.paidAt).toLocaleDateString('id-ID', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                              </div>
                              <div className="text-[10px] text-text-secondary mt-0.5">Diterima oleh: {p.kasirId}</div>
                            </div>
                            <span className="material-symbols-outlined text-success">check_circle</span>
                          </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center h-[70vh] text-text-secondary">
                <span className="material-symbols-outlined text-[48px] opacity-20 mb-4">account_balance_wallet</span>
                <p>Pilih data utang di tabel untuk melihat detail dan riwayat cicilan.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
