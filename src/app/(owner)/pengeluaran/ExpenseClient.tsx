'use client';

import React, { useState } from 'react';
import { addExpense, deleteExpense } from './actions';
import { useToast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Trash2, PlusCircle, Filter } from 'lucide-react';

interface Expense {
  id: string;
  date: Date;
  category: string;
  amount: number;
  notes: string | null;
  employeeId: string;
  employee?: { name: string };
  syncStatus: string;
}

interface ExpenseClientProps {
  expenses: Expense[];
}

const CATEGORIES = [
  'LISTRIK',
  'TRANSPORT',
  'PERLENGKAPAN',
  'KONSUMSI',
  'LAINNYA'
];

export default function ExpenseClient({ expenses }: ExpenseClientProps) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

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
    if (!confirm('Apakah Anda yakin ingin menghapus pengeluaran ini? Tindakan ini tidak dapat dibatalkan.')) return;
    
    const res = await deleteExpense(id);
    if (res.success) {
      toast.success('Pengeluaran berhasil dihapus!');
    } else {
      toast.error(res.error || 'Gagal menghapus pengeluaran.');
    }
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Pengeluaran Operasional</h2>
          <p className="text-sm text-text-secondary mt-1">Kelola dan tinjau semua kas keluar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Tambah */}
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
        <div className="lg:col-span-2">
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface-container-high/30">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Filter size={18} className="text-text-secondary" />
                Semua Riwayat
              </h3>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-surface-container-high border-b border-border">
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Tanggal</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Kategori</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Keterangan</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Nominal</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-text-secondary">Belum ada pengeluaran.</td>
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
          </div>
        </div>

      </div>
    </div>
  );
}
