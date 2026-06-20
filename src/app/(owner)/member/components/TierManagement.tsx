'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { saveTier, deleteTier } from '../actions';
import { useToast } from '@/components/ui/Toast';

export function TierManagement({ tiers }: { tiers: any[] }) {
  const [editingTier, setEditingTier] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const toast = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const result = await saveTier(formData);
    if (result.success) {
      toast.success('Level Member berhasil disimpan!');
      setEditingTier(null);
      setIsAdding(false);
    } else {
      toast.error(result.error || 'Terjadi kesalahan.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus level ini?')) {
      const result = await deleteTier(id);
      if (result.success) {
        toast.success('Level Member berhasil dihapus!');
      } else {
        toast.error(result.error || 'Terjadi kesalahan saat menghapus.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-border">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Atur Level Member</h3>
          <p className="text-sm text-text-secondary mt-1">Buat tingkatan untuk memberi diskon otomatis bagi pelanggan loyal Anda.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-primary-container text-on-primary-fixed px-4 py-2 rounded-lg font-bold hover:brightness-110 transition-all text-sm"
          >
            <Plus size={18} /> Tambah Level
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-surface border border-border p-6 rounded-xl space-y-4">
          <h4 className="font-bold text-text-primary">Tambah Level Baru</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Nama Level (Contoh: Gold)</label>
              <input name="name" required className="w-full bg-background border border-border focus:border-primary-container rounded-lg px-3 py-2 text-sm text-text-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Syarat Transaksi</label>
              <input name="minTransactions" type="number" min="0" required defaultValue="10" className="w-full bg-background border border-border focus:border-primary-container rounded-lg px-3 py-2 text-sm text-text-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">ATAU Syarat Total Belanja (Rp)</label>
              <input name="minTotalSpent" type="number" min="0" required defaultValue="0" className="w-full bg-background border border-border focus:border-primary-container rounded-lg px-3 py-2 text-sm text-text-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Min Belanja untuk Diskon (Rp)</label>
              <input name="minOrderAmount" type="number" min="0" required defaultValue="50000" className="w-full bg-background border border-border focus:border-primary-container rounded-lg px-3 py-2 text-sm text-text-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Persentase Diskon (%)</label>
              <input name="discountPercentage" type="number" min="0" max="100" step="0.1" required defaultValue="5" className="w-full bg-background border border-border focus:border-primary-container rounded-lg px-3 py-2 text-sm text-text-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Maksimal Diskon (Rp) *0 = Tanpa Batas</label>
              <input name="maxDiscountAmount" type="number" min="0" required defaultValue="25000" className="w-full bg-background border border-border focus:border-primary-container rounded-lg px-3 py-2 text-sm text-text-primary outline-none" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-lg text-text-secondary hover:bg-surface-container transition-colors text-sm font-medium">Batal</button>
            <button type="submit" className="bg-primary-container text-on-primary-fixed px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110">Simpan Level</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map(tier => (
          <div key={tier.id} className="bg-surface rounded-xl border border-border p-6 relative overflow-hidden group">
            {editingTier === tier.id ? (
              <form onSubmit={handleSave} className="space-y-4">
                <input type="hidden" name="id" value={tier.id} />
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-text-secondary">Nama Level</label>
                    <input name="name" defaultValue={tier.name} required className="w-full bg-background border border-border rounded p-1.5 text-sm text-text-primary" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-text-secondary">Min Transaksi</label>
                      <input name="minTransactions" type="number" defaultValue={tier.minTransactions} required className="w-full bg-background border border-border rounded p-1.5 text-sm text-text-primary" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-text-secondary">ATAU Total Belanja</label>
                      <input name="minTotalSpent" type="number" defaultValue={tier.minTotalSpent || 0} required className="w-full bg-background border border-border rounded p-1.5 text-sm text-text-primary" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-text-secondary">Diskon %</label>
                      <input name="discountPercentage" type="number" step="0.1" defaultValue={tier.discountPercentage} required className="w-full bg-background border border-border rounded p-1.5 text-sm text-text-primary" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-text-secondary">Min Belanja</label>
                      <input name="minOrderAmount" type="number" defaultValue={tier.minOrderAmount} required className="w-full bg-background border border-border rounded p-1.5 text-sm text-text-primary" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-text-secondary">Maks Diskon</label>
                      <input name="maxDiscountAmount" type="number" defaultValue={tier.maxDiscountAmount} required className="w-full bg-background border border-border rounded p-1.5 text-sm text-text-primary" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" className="flex-1 bg-primary-container text-on-primary-fixed text-xs font-bold py-2 rounded">Simpan</button>
                  <button type="button" onClick={() => setEditingTier(null)} className="flex-1 border border-border text-text-secondary text-xs font-bold py-2 rounded hover:bg-surface-container">Batal</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-black text-text-primary">{tier.name}</h4>
                    <p className="text-xs text-text-secondary mt-0.5">Syarat: {tier.minTransactions}x Trx ATAU Total Blj Rp {tier.minTotalSpent?.toLocaleString('id-ID') || 0}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingTier(tier.id)} className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-text-primary hover:text-primary-container transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(tier.id)} className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center text-danger hover:bg-danger hover:text-white transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Diskon</span>
                    <span className="font-bold text-primary-container">{tier.discountPercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Min. Belanja</span>
                    <span className="font-bold text-text-primary text-xs">Rp {tier.minOrderAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Maks. Diskon</span>
                    <span className="font-bold text-text-primary text-xs">{tier.maxDiscountAmount > 0 ? `Rp ${tier.maxDiscountAmount.toLocaleString('id-ID')}` : 'Tanpa Batas'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        {tiers.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-text-secondary bg-surface border border-dashed border-border rounded-xl">
            <p>Belum ada Level Member yang diatur.</p>
            <button onClick={() => setIsAdding(true)} className="mt-3 text-primary-container font-bold hover:underline">Buat Level Pertama</button>
          </div>
        )}
      </div>
    </div>
  );
}
