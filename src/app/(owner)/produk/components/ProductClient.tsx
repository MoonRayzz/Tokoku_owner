'use client';

import React, { useState, useMemo } from 'react';
import { Product, StockLog } from '@prisma/client';
import { 
  Search, 
  AlertTriangle,
  Download,
  Edit,
  X,
  Info,
  History
} from 'lucide-react';
import { updateProduct } from '../actions';
import { useToast } from '@/components/ui/Toast';

type ProductWithLogs = Product & { StockLog: StockLog[] };

interface ProductClientProps {
  products: ProductWithLogs[];
}

export default function ProductClient({ products }: ProductClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithLogs | null>(null);
  const [historyProduct, setHistoryProduct] = useState<ProductWithLogs | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isExporting, setIsExporting] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const handleOpenModal = (product: ProductWithLogs) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (editingProduct) {
      formData.append('id', editingProduct.id);
    }
    
    const result = await updateProduct(formData);
    setLoading(false);
    
    if (result.success) {
      toast.success("Produk berhasil diupdate!");
      handleCloseModal();
    } else {
      toast.error("Gagal mengupdate produk: " + result.error);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const url = new URL('/api/export/produk', window.location.origin);
      url.searchParams.set('startDate', exportStartDate);
      url.searchParams.set('endDate', exportEndDate);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Gagal mengunduh data');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Laporan_Produk_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Subheader Message */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-text-primary">Master Produk</h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-container/10 text-primary-container border border-primary-container/20">
            Sinkronisasi Otomatis ✓
          </span>
        </div>
        <p className="text-sm text-text-secondary mt-1">
          Kelola harga dan stok secara terpusat — perubahan otomatis tersinkronisasi ke kasir
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface border border-border p-4 rounded-xl shadow-sm">
        <div className="flex items-center flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 text-text-secondary" size={18} />
          <input 
            className="w-full bg-background border border-border focus:border-primary-container focus:ring-1 focus:ring-primary-container text-sm rounded-lg pl-10 h-10 transition-all text-text-primary outline-none" 
            placeholder="Cari nama produk atau SKU..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg hover:bg-surface-container transition-colors text-sm font-medium"
          >
            <Download size={18} className="mr-2" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-high border-b border-border">
                <th className="px-6 py-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Produk</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Harga Modal</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Harga Ecer</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Harga Grosir</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-center">Min. Grosir</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Stok</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">Belum ada data produk.</td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isLowStock = p.stock <= p.minStockAlert;
                  return (
                    <tr key={p.id} className={`hover:bg-surface-container transition-colors group ${isLowStock ? 'border-l-4 border-l-warning bg-warning/5' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-text-primary">{p.name}</span>
                          <span className="text-xs text-text-secondary">{p.sku}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-text-secondary">{p.priceBuy ? `Rp ${p.priceBuy.toLocaleString('id-ID')}` : '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-text-primary">
                        Rp {p.priceRetail.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-text-primary">
                        {p.priceWholesale ? `Rp ${p.priceWholesale.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-text-primary">
                        {p.wholesaleMinQty ? `${p.wholesaleMinQty} unit` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${isLowStock ? 'text-warning' : 'text-primary-container'}`}>
                              {p.stock} unit
                            </span>
                            {isLowStock && <AlertTriangle size={14} className="text-warning" />}
                          </div>
                          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${isLowStock ? 'bg-warning' : 'bg-primary-container'}`} 
                              style={{ width: `${Math.min(100, (p.stock / Math.max(p.minStockAlert * 3, 10)) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center gap-2">
                          <button 
                            onClick={() => setHistoryProduct(p)}
                            className="p-2 text-text-secondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all" 
                            title="Riwayat Stok"
                          >
                            <History size={18} />
                          </button>
                          <button 
                            onClick={() => handleOpenModal(p)}
                            className="p-2 text-text-secondary hover:text-primary-container hover:bg-surface-container-high rounded-lg transition-all" 
                            title="Ubah Produk"
                          >
                            <Edit size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Edit Produk */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Ubah Produk</h3>
              <button onClick={handleCloseModal} className="p-1 hover:bg-surface-container-high text-text-secondary hover:text-text-primary rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Nama Produk</label>
                <input 
                  name="name" 
                  defaultValue={editingProduct.name} 
                  required 
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">SKU</label>
                <input 
                  name="sku" 
                  defaultValue={editingProduct.sku} 
                  required 
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Harga Beli / HPP</label>
                  <input 
                    type="number" 
                    name="priceBuy" 
                    defaultValue={editingProduct.priceBuy || ''} 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Harga Retail</label>
                  <input 
                    type="number" 
                    name="priceRetail" 
                    defaultValue={editingProduct.priceRetail} 
                    required 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Stok</label>
                <input 
                  type="number" 
                  name="stock" 
                  defaultValue={editingProduct.stock} 
                  required 
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Harga Grosir (Opsional)</label>
                  <input 
                    type="number" 
                    name="priceWholesale" 
                    defaultValue={editingProduct.priceWholesale || ''} 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Min. Grosir (Opsional)</label>
                  <input 
                    type="number" 
                    name="wholesaleMinQty" 
                    defaultValue={editingProduct.wholesaleMinQty || ''} 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Batas Stok Menipis (Alert)</label>
                <input 
                  type="number" 
                  name="minStockAlert" 
                  defaultValue={editingProduct.minStockAlert || 5} 
                  required 
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div className="bg-primary-container/10 p-3 rounded-lg border border-primary-container/20 flex gap-2">
                <Info size={16} className="text-primary-container flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  Perubahan akan disinkronkan secara otomatis ke kasir yang terhubung.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary-container hover:bg-primary text-on-primary-container font-semibold py-2.5 rounded-lg transition-all mt-4 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Stok */}
      {historyProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface-container-low">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Riwayat Stok</h3>
                <p className="text-sm text-text-secondary">{historyProduct.name} ({historyProduct.sku})</p>
              </div>
              <button onClick={() => setHistoryProduct(null)} className="p-2 hover:bg-surface-container-high text-text-secondary hover:text-text-primary rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1">
              {(!historyProduct.StockLog || historyProduct.StockLog.length === 0) ? (
                <div className="p-8 text-center text-text-secondary">Belum ada riwayat pergerakan stok.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container/50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-text-secondary">Tanggal</th>
                      <th className="px-6 py-3 font-semibold text-text-secondary">Tipe</th>
                      <th className="px-6 py-3 font-semibold text-text-secondary">Jumlah</th>
                      <th className="px-6 py-3 font-semibold text-text-secondary">Sisa Stok</th>
                      <th className="px-6 py-3 font-semibold text-text-secondary">Keterangan</th>
                      <th className="px-6 py-3 font-semibold text-text-secondary">Kasir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyProduct.StockLog.map(log => {
                      let typeColor = 'text-text-secondary';
                      let typeLabel = log.type;
                      let amountPrefix = '';
                      
                      if (log.type === 'IN') { typeColor = 'text-status-success font-medium'; typeLabel = 'Masuk (PO)'; amountPrefix = '+'; }
                      else if (log.type === 'OUT') { typeColor = 'text-brand-secondary font-medium'; typeLabel = 'Terjual'; amountPrefix = '-'; }
                      else if (log.type === 'CORRECTION') { typeColor = 'text-warning font-medium'; typeLabel = log.amount > 0 ? 'Tambah Stok' : 'Koreksi'; amountPrefix = (log.amount > 0 ? '+' : ''); }
                      else if (log.type === 'VOID_RETURN') { typeColor = 'text-status-success font-medium'; typeLabel = 'Void / Retur'; amountPrefix = '+'; }

                      return (
                        <tr key={log.id} className="hover:bg-surface-container/30 transition-colors">
                          <td className="px-6 py-3 text-text-primary">{new Date(log.date).toLocaleString('id-ID')}</td>
                          <td className={`px-6 py-3 ${typeColor}`}>{typeLabel}</td>
                          <td className={`px-6 py-3 ${typeColor}`}>{amountPrefix}{log.amount}</td>
                          <td className="px-6 py-3 text-text-primary font-medium">{log.stockAfter}</td>
                          <td className="px-6 py-3 text-text-secondary">{log.notes || '-'}</td>
                          <td className="px-6 py-3 text-text-secondary">{log.employeeId || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Filter Export */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border bg-surface-container/30">
              <h2 className="text-xl font-bold text-text-primary">Export Excel Produk</h2>
              <button onClick={() => setShowExportModal(false)} className="text-text-secondary hover:text-text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-text-secondary mb-4">Pilih rentang tanggal untuk mengambil data Riwayat Stok Masuk dan Keluar. Sheet Master Produk akan selalu menggunakan stok riil saat ini.</p>
              
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
