'use client';

import React, { useState, useMemo } from 'react';
import { Product } from '@prisma/client';
import { 
  Search, 
  AlertTriangle,
  Download,
  Edit,
  X,
  Info
} from 'lucide-react';
import { updateProduct } from '../actions';
import { useToast } from '@/components/ui/Toast';

interface ProductClientProps {
  products: Product[];
}

export default function ProductClient({ products }: ProductClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const handleOpenModal = (product: Product) => {
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

  const handleExportCSV = () => {
    if (filteredProducts.length === 0) return;
    
    // CSV Header
    const headers = ['SKU', 'Nama Produk', 'Harga Jual', 'Harga Grosir', 'Min Grosir', 'Stok', 'Batas Stok Alert'];
    
    // CSV Rows
    const rows = filteredProducts.map(p => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      p.priceRetail,
      p.priceWholesale || '',
      p.wholesaleMinQty || '',
      p.stock,
      p.minStockAlert
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Data_Produk_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button 
            onClick={handleExportCSV}
            className="w-full lg:w-auto bg-surface-bright border border-border text-text-primary hover:bg-surface-container-high font-semibold px-6 h-10 rounded-lg flex items-center justify-center transition-all shadow-sm"
          >
            <Download size={18} className="mr-2" />
            Export CSV
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
                        <span className="text-text-secondary">Rp {p.priceRetail.toLocaleString('id-ID')}</span>
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
                  <label className="text-xs font-semibold text-text-secondary uppercase">Harga Retail</label>
                  <input 
                    type="number" 
                    name="priceRetail" 
                    defaultValue={editingProduct.priceRetail} 
                    required 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                  />
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

    </div>
  );
}
