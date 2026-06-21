'use client';

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';

interface ProductAnalytics {
  id: string;
  name: string;
  stock: number;
  totalSold: number;
  omzet: number;
  profit: number;
  margin: number;
  lastSold: string | null;
}

interface AnalitikClientProps {
  data: ProductAnalytics[];
}

type SortField = 'totalSold' | 'omzet' | 'profit' | 'margin' | 'lastSold' | 'name';
type SortOrder = 'asc' | 'desc';

export default function AnalitikClient({ data }: AnalitikClientProps) {
  const [chartMetric, setChartMetric] = useState<'totalSold' | 'omzet'>('totalSold');
  const [sortField, setSortField] = useState<SortField>('totalSold');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const formatRp = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Top 10 for chart
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => b[chartMetric] - a[chartMetric])
      .slice(0, 10)
      .map(item => ({
        name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
        fullName: item.name,
        value: item[chartMetric],
      }));
  }, [data, chartMetric]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to descending when changing fields
    }
  };

  const sortedTableData = useMemo(() => {
    return [...data].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      
      // Handle null lastSold (treat as very old date)
      if (sortField === 'lastSold') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortOrder]);

  const now = new Date().getTime();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      
      {/* Chart Section */}
      <section className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-text-primary">Top 10 Produk Terlaris</h3>
          <div className="flex bg-surface-variant rounded-lg p-1">
            <button 
              onClick={() => setChartMetric('totalSold')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartMetric === 'totalSold' ? 'bg-surface shadow text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Berdasarkan Qty
            </button>
            <button 
              onClick={() => setChartMetric('omzet')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartMetric === 'omzet' ? 'bg-surface shadow text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Berdasarkan Omzet
            </button>
          </div>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                angle={-45} 
                textAnchor="end" 
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                tickFormatter={(value) => chartMetric === 'omzet' ? `Rp${(value/1000).toFixed(0)}k` : value}
              />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(51, 65, 85, 0.1)' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [chartMetric === 'omzet' ? formatRp(Number(value)) : `${value} item`, chartMetric === 'omzet' ? 'Omzet' : 'Terjual']}
                labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
              />
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={50}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartMetric === 'totalSold' ? '#3b82f6' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Table Section */}
      <section className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Tabel Analitik Lengkap</h3>
            <p className="text-xs text-text-secondary mt-1">
              Produk dengan *highlight* merah belum terjual selama lebih dari 30 hari (Dead Stock).
            </p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-border text-xs uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="py-3 px-6 font-semibold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('name')}>
                  Produk {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-6 font-semibold cursor-pointer hover:text-primary transition-colors text-right" onClick={() => handleSort('totalSold')}>
                  Total Terjual {sortField === 'totalSold' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-6 font-semibold cursor-pointer hover:text-primary transition-colors text-right" onClick={() => handleSort('omzet')}>
                  Omzet {sortField === 'omzet' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-6 font-semibold cursor-pointer hover:text-primary transition-colors text-right" onClick={() => handleSort('profit')}>
                  Profit {sortField === 'profit' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-6 font-semibold cursor-pointer hover:text-primary transition-colors text-right" onClick={() => handleSort('margin')}>
                  Margin % {sortField === 'margin' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-6 font-semibold cursor-pointer hover:text-primary transition-colors text-center" onClick={() => handleSort('lastSold')}>
                  Terakhir Terjual {sortField === 'lastSold' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedTableData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-secondary">
                    Tidak ada data produk.
                  </td>
                </tr>
              ) : (
                sortedTableData.map((item) => {
                  const isDeadStock = !item.lastSold || (now - new Date(item.lastSold).getTime() > THIRTY_DAYS_MS);
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`border-b border-border/50 hover:bg-surface-variant transition-colors ${isDeadStock ? 'bg-danger/5' : ''}`}
                    >
                      <td className="py-3 px-6">
                        <div className="font-medium text-text-primary">{item.name}</div>
                        {isDeadStock && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-danger/10 text-danger border border-danger/20">
                            DEAD STOCK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right font-mono font-medium">
                        {item.totalSold}
                      </td>
                      <td className="py-3 px-6 text-right text-text-secondary">
                        {formatRp(item.omzet)}
                      </td>
                      <td className="py-3 px-6 text-right text-primary-container font-medium">
                        {formatRp(item.profit)}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.margin > 20 ? 'bg-success/20 text-success' : item.margin > 0 ? 'bg-warning/20 text-warning' : 'bg-surface-variant text-text-secondary'}`}>
                          {item.margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center text-text-secondary text-xs">
                        {item.lastSold ? (
                          <>
                            <div>{new Date(item.lastSold).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div className="opacity-70">{new Date(item.lastSold).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                          </>
                        ) : (
                          <span className="italic opacity-50">Belum pernah terjual</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
