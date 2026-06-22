'use client';

import React, { useState } from 'react';
import { addExpense, deleteExpense } from './actions';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Trash2, PlusCircle, Filter, Search, Download, X } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebounce } from 'use-debounce';

interface Expense {
  id: string;
  date: Date;
  category: string;
  amount: number;
  notes: string | null;
  employeeId: string;
  employee?: { name: string };
  shift?: { name: string };
  syncStatus: string;
}

interface ExpenseClientProps {
  expenses: Expense[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
  limit: number;
  initialSearch: string;
  initialCategory: string;
  employees: { id: string, name: string }[];
  shifts: { id: string, name: string }[];
}

const CATEGORIES = [
  'LISTRIK',
  'TRANSPORT',
  'PERLENGKAPAN',
  'KONSUMSI',
  'LAINNYA'
];

export default function ExpenseClient({ expenses, totalPages, totalCount, currentPage, limit, initialSearch, initialCategory, employees, shifts }: ExpenseClientProps) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch] = useDebounce(searchQuery, 500);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);

  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Sync search and filter to URL
  React.useEffect(() => {
    const currentQuery = searchParams.toString();
    const params = new URLSearchParams(currentQuery);
    
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
      if (debouncedSearch !== initialSearch) params.set('page', '1');
    } else {
      params.delete('search');
      if (debouncedSearch !== initialSearch) params.set('page', '1');
    }

    if (categoryFilter !== 'all') {
      params.set('category', categoryFilter);
      if (categoryFilter !== initialCategory) params.set('page', '1');
    } else {
      params.delete('category');
      if (categoryFilter !== initialCategory) params.set('page', '1');
    }
    
    const newQuery = params.toString();
    if (currentQuery !== newQuery) {
      router.replace(`${pathname}?${newQuery}`, { scroll: false });
    }
  }, [debouncedSearch, categoryFilter, pathname, router, searchParams, initialSearch, initialCategory]);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const url = new URL('/api/export/pengeluaran', window.location.origin);
      url.searchParams.set('startDate', exportStartDate);
      url.searchParams.set('endDate', exportEndDate);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Gagal mengunduh data');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Laporan_Pengeluaran_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowExportModal(false);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengekspor data Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await addExpense(formData);

    setLoading(false);
    if (res.success) {
      toast.success('Pengeluaran berhasil ditambahkan!');
      (e.target as HTMLFormElement).reset();
    } else {
      toast.error(res.error || 'Gagal menambahkan pengeluaran.');
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Hapus Pengeluaran',
      message: 'Apakah Anda yakin ingin menghapus pengeluaran ini? Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Ya, Hapus',
      variant: 'danger'
    });
    
    if (!isConfirmed) return;
    
    const res = await deleteExpense(id);
    if (res.success) {
      toast.success('Pengeluaran berhasil dihapus!');
    } else {
      toast.error(res.error || 'Gagal menghapus pengeluaran.');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Pengeluaran Operasional</h2>
          <p className="text-sm text-text-secondary mt-1">Kelola dan tinjau semua kas keluar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Form Entry */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <PlusCircle size={20} className="text-primary-container" />
              Tambah Pengeluaran
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Kategori</label>
                <select 
                  name="category" 
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-container"
                >
                  <option value="">Pilih Kategori...</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Nominal (Rp)</label>
                <input 
                  type="number" 
                  name="amount" 
                  min="1"
                  required
                  placeholder="0"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-container"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Karyawan</label>
                <select 
                  name="employeeId" 
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-container"
                >
                  <option value="">Pilih Karyawan...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Sesi / Shift</label>
                <select 
                  name="shiftId" 
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-container"
                >
                  <option value="">Pilih Sesi...</option>
                  {shifts.map(shift => (
                    <option key={shift.id} value={shift.id}>{shift.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Keterangan</label>
                <textarea 
                  name="notes" 
                  rows={3}
                  placeholder="Opsional"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-container resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary-container hover:bg-primary text-on-primary-container font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </form>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="lg:col-span-3 flex flex-col min-h-[400px]">
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm flex flex-col flex-1">
            <div className="p-5 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center bg-surface-container-high/30 gap-4">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Filter size={18} className="text-text-secondary" />
                Semua Riwayat
              </h3>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                  <input 
                    className="w-full bg-background border border-border focus:border-primary-container focus:ring-1 focus:ring-primary-container text-sm rounded-lg pl-9 h-9 transition-all text-text-primary outline-none" 
                    placeholder="Cari keterangan..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="bg-background border border-border focus:border-primary-container focus:ring-1 focus:ring-primary-container text-sm rounded-lg h-9 px-3 text-text-primary outline-none"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  <option value="all">Semua Kategori</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center h-9 px-4 bg-surface border border-border text-text-secondary rounded-lg hover:bg-surface-container transition-colors text-sm font-medium"
                >
                  <Download size={16} className="mr-2" />
                  Export
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high border-b border-border">
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Tanggal</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Kategori</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Keterangan</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Karyawan</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Sesi</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Nominal</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-text-secondary">Belum ada pengeluaran.</td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-surface-container transition-colors">
                        <td className="px-5 py-3 text-sm text-text-primary whitespace-nowrap">
                          {format(new Date(exp.date), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-text-primary">
                          <span className="bg-surface-container-highest px-2 py-1 rounded text-xs">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-text-secondary max-w-[200px] truncate">
                          {exp.notes || '-'}
                        </td>
                        <td className="px-5 py-3 text-sm text-text-primary">
                          {exp.employee?.name || '-'}
                        </td>
                        <td className="px-5 py-3 text-sm text-text-primary">
                          {exp.shift?.name || '-'}
                        </td>
                        <td className="px-5 py-3 text-sm text-right font-semibold text-error">
                          Rp {exp.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button 
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-all"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
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

      {/* Modal Filter Export */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border bg-surface-container/30">
              <h2 className="text-xl font-bold text-text-primary">Export Excel Pengeluaran</h2>
              <button onClick={() => setShowExportModal(false)} className="text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-text-secondary mb-4">Pilih rentang tanggal untuk mengunduh laporan pengeluaran toko.</p>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Dari Tanggal</label>
                <input 
                  type="date" 
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-primary-container/50 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Sampai Tanggal</label>
                <input 
                  type="date" 
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-primary-container/50 transition-colors"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border bg-surface-container/30 flex justify-end gap-3">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-6 py-2 rounded-lg font-semibold text-text-secondary hover:bg-surface-container transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleExportExcel}
                disabled={isExporting}
                className="px-6 py-2 bg-primary-container text-on-primary-fixed rounded-lg font-bold hover:brightness-110 transition-all flex items-center justify-center min-w-[120px] disabled:opacity-50"
              >
                {isExporting ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                ) : (
                  'Download Excel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
