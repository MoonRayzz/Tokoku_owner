'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Search, Download, MoreVertical, Lightbulb } from 'lucide-react';
import { TierManagement } from './TierManagement';

interface MemberTier {
  id: string;
  name: string;
  minTransactions: number;
  minOrderAmount: number;
  discountPercentage: number;
  maxDiscountAmount: number;
}

interface MemberStats {
  id: string;
  name: string;
  phone: string;
  joinedAt: Date;
  totalSpent: number;
  totalTransactions: number;
  transactionsThisMonth: number;
  tier: string;
}

interface MemberClientProps {
  members: MemberStats[];
  totalMembers: number;
  newMembersThisMonth: number;
  totalAllTimeSpent: number;
  mostActiveMember: MemberStats | null;
  top10: MemberStats[];
  tierCount: Record<string, number>;
  tiers: MemberTier[];
}

export default function MemberClient({
  members,
  totalMembers,
  newMembersThisMonth,
  totalAllTimeSpent,
  mostActiveMember,
  top10,
  tierCount,
  tiers
}: MemberClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('Semua Tier');
  const [activeTab, setActiveTab] = useState<'DAFTAR' | 'PENGATURAN'>('DAFTAR');

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.phone.includes(searchQuery);
    const matchesTier = tierFilter === 'Semua Tier' || m.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const getTierColor = (tier: string) => {
    if (tier === 'Tanpa Level') return 'bg-surface-container-high text-text-secondary border-border';
    // Dynamic colors for custom tiers based on name hash or just alternating
    const colors = [
      'bg-primary/10 text-primary border-primary/20',
      'bg-secondary/10 text-secondary border-secondary/20',
      'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'bg-purple-500/10 text-purple-500 border-purple-500/20'
    ];
    let hash = 0;
    for (let i = 0; i < tier.length; i++) hash = tier.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
      {/* Header Section & Tabs */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">Pelanggan Member</h2>
          <p className="text-text-secondary text-sm">Pantau loyalitas dan nilai belanja member toko Anda</p>
        </div>
        <div className="flex bg-surface-container rounded-lg p-1 border border-border">
          <button 
            onClick={() => setActiveTab('DAFTAR')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'DAFTAR' ? 'bg-surface border border-border text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Daftar Member
          </button>
          <button 
            onClick={() => setActiveTab('PENGATURAN')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'PENGATURAN' ? 'bg-surface border border-border text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Pengaturan Level
          </button>
        </div>
      </section>

      {activeTab === 'PENGATURAN' ? (
        <TierManagement tiers={tiers} />
      ) : (
        <>

      {/* KPI Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-border p-6 rounded-xl hover:border-primary-container/50 transition-all duration-300">
          <p className="text-text-secondary text-[11px] font-semibold tracking-wider uppercase mb-3">TOTAL MEMBER</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-text-primary">{totalMembers}</span>
            <span className="bg-primary-container/10 text-primary-container text-[11px] font-bold px-2 py-1 rounded-full border border-primary-container/20">
              +{newMembersThisMonth} bulan ini
            </span>
          </div>
        </div>

        <div className="bg-surface border border-border p-6 rounded-xl hover:border-primary-container/50 transition-all duration-300">
          <p className="text-text-secondary text-[11px] font-semibold tracking-wider uppercase mb-3">TOTAL BELANJA MEMBER</p>
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-primary-container">Rp {totalAllTimeSpent.toLocaleString('id-ID')}</span>
            <span className="text-text-secondary text-xs mt-1">sepanjang masa</span>
          </div>
        </div>

        <div className="bg-surface border border-border p-6 rounded-xl hover:border-primary-container/50 transition-all duration-300">
          <p className="text-text-secondary text-[11px] font-semibold tracking-wider uppercase mb-3">MEMBER PALING AKTIF BULAN INI</p>
          {mostActiveMember ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center border border-primary-container/40">
                <span className="text-primary-container font-bold text-lg">{getInitials(mostActiveMember.name)}</span>
              </div>
              <div>
                <p className="text-text-primary font-bold text-sm leading-tight">{mostActiveMember.name}</p>
                <p className="text-text-secondary text-xs">{mostActiveMember.transactionsThisMonth} transaksi</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-text-secondary">Belum ada transaksi bulan ini</div>
          )}
        </div>
      </section>

      {/* Middle Columns */}
      <section className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left: Top 10 Loyal Customers */}
        <div className="lg:col-span-6 bg-surface rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold text-text-primary">Top 10 Pelanggan Loyal</h3>
            <MoreVertical size={20} className="text-text-secondary cursor-pointer hover:text-primary-container" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high text-text-secondary text-[11px] uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Rank</th>
                  <th className="px-6 py-4 font-semibold">Member</th>
                  <th className="px-6 py-4 font-semibold">Tier</th>
                  <th className="px-6 py-4 font-semibold">Transaksi</th>
                  <th className="px-6 py-4 font-semibold text-right">Total Belanja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {top10.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-text-secondary text-sm">Belum ada data.</td>
                  </tr>
                ) : (
                  top10.map((member, index) => (
                    <tr key={member.id} className="hover:bg-surface-container transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xl font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-text-secondary'}`}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-container border border-border flex items-center justify-center text-xs font-bold text-text-primary">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-text-primary">{member.name}</p>
                            <p className="text-text-secondary text-[11px]">{member.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-widest ${getTierColor(member.tier)}`}>
                          {member.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary">{member.totalTransactions}</td>
                      <td className="px-6 py-4 text-right text-primary-container font-bold text-sm">Rp {member.totalSpent.toLocaleString('id-ID')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Distribution & Insight */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface p-6 rounded-xl border border-border flex-1">
            <h3 className="text-lg font-bold text-text-primary mb-6">Distribusi Tier Member</h3>
            <div className="flex items-center justify-center relative py-4">
              <svg className="w-48 h-48 -rotate-90">
                <circle cx="96" cy="96" fill="transparent" r="80" stroke="#334155" strokeWidth="12"></circle>
                {(() => {
                  let currentOffset = 0;
                  const totalLength = 502;
                  return Object.keys(tierCount).filter(t => t !== 'Tanpa Level').map((tierName, idx) => {
                    const count = tierCount[tierName];
                    if (count === 0) return null;
                    const percentage = count / (totalMembers || 1);
                    const dashArray = `${percentage * totalLength} ${totalLength}`;
                    const dashOffset = -currentOffset;
                    currentOffset += percentage * totalLength;
                    
                    const colors = ['#10b981', '#ffb95f', '#3b82f6', '#8b5cf6', '#ec4899'];
                    const color = colors[idx % colors.length];

                    return (
                      <circle 
                        key={tierName}
                        cx="96" cy="96" fill="transparent" r="80" 
                        stroke={color} 
                        strokeDasharray={dashArray} 
                        strokeDashoffset={dashOffset} 
                        strokeWidth="12"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-text-primary">{totalMembers}</span>
                <span className="text-xs text-text-secondary">Total Member</span>
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              {Object.keys(tierCount).map((tierName, idx) => {
                const colors = ['bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];
                const colorClass = tierName === 'Tanpa Level' ? 'bg-slate-600' : colors[idx % colors.length];
                const percentage = totalMembers ? Math.round((tierCount[tierName] / totalMembers) * 100) : 0;
                
                return (
                  <div key={tierName} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                      <span className="text-text-secondary">{tierName} ({percentage}%)</span>
                    </div>
                    <span className="font-bold text-text-primary">{tierCount[tierName]} Member</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insight Card */}
          <div className="bg-secondary/5 border border-secondary/30 p-4 rounded-xl flex gap-4">
            <Lightbulb className="text-secondary shrink-0" size={24} />
            <div>
              <p className="text-sm font-semibold text-secondary mb-1">Retensi Insight</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                {totalMembers ? Math.round((tierCount['Tanpa Level']/totalMembers)*100) : 0}% member belum naik tier (Tanpa Level). Pertimbangkan program loyalitas untuk meningkatkan retensi dan mendorong transaksi berkelanjutan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Table */}
      <section className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-lg font-bold text-text-primary">Daftar Semua Member</h3>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                className="bg-background border border-border focus:border-primary-container focus:ring-1 focus:ring-primary-container text-sm rounded-lg pl-9 pr-3 py-2 w-full md:w-64 outline-none text-text-primary transition-all" 
                placeholder="Cari data member..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="bg-background border border-border text-text-primary text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary-container"
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value)}
            >
              <option value="Semua Tier">Semua Tier</option>
              {tiers.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
              <option value="Tanpa Level">Tanpa Level</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high text-text-secondary text-[11px] uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">ID Member</th>
                <th className="px-6 py-4 font-semibold">Nama</th>
                <th className="px-6 py-4 font-semibold">No. Handphone</th>
                <th className="px-6 py-4 font-semibold">Tier</th>
                <th className="px-6 py-4 font-semibold">Join Date</th>
                <th className="px-6 py-4 font-semibold text-right">Total Belanja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-text-secondary">Tidak ada data member yang sesuai.</td>
                </tr>
              ) : (
                filteredMembers.map(member => (
                  <tr key={member.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-6 py-4 font-semibold text-text-secondary text-xs truncate max-w-[120px]" title={member.id}>
                      #{member.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-bold text-text-primary">{member.name}</td>
                    <td className="px-6 py-4 text-text-secondary">{member.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${getTierColor(member.tier)}`}>
                        {member.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {format(new Date(member.joinedAt), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-text-primary">
                      Rp {member.totalSpent.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
        </>
      )}
    </div>
  );
}
