'use client';

import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Search, Download, MoreVertical, Lightbulb, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { TierManagement } from './TierManagement';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useReactToPrint } from 'react-to-print';
import { PrintableMemberCards } from './PrintableMemberCards';
import { MemberCardProps } from './MemberCard';

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
  avgSpent: number;
  lastSold: string | null;
  tier: string;
  segment: string;
}

interface MemberClientProps {
  members: MemberStats[];
  totalMembers: number;
  newMembersThisMonth: number;
  totalAllTimeSpent: number;
  top10: MemberStats[];
  tierCount: Record<string, number>;
  tiers: MemberTier[];
  currentPage: number;
  totalPages: number;
  currentSearch: string;
  currentSort: string;
  currentOrder: string;
  storeProfile: { name: string; logoUrl: string | null; };
}

export default function MemberClient({
  members,
  totalMembers,
  newMembersThisMonth,
  totalAllTimeSpent,
  top10,
  tierCount,
  tiers,
  currentPage,
  totalPages,
  currentSearch,
  currentSort,
  currentOrder,
  storeProfile
}: MemberClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [activeTab, setActiveTab] = useState<'DAFTAR' | 'PENGATURAN'>('DAFTAR');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Kartu Member TokoKu',
  });

  const toggleSelectAll = () => {
    if (selectedMembers.size === members.length && members.length > 0) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map(m => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedMembers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMembers(newSet);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ search: searchQuery, page: 1 });
  };

  const handleSort = (field: string) => {
    const isAsc = currentSort === field && currentOrder === 'asc';
    updateUrl({ sort: field, order: isAsc ? 'desc' : 'asc', page: 1 });
  };

  const updateUrl = (updates: Record<string, string | number>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
      else params.delete(key);
    });
    router.push(`/member?${params.toString()}`);
  };

  const getTierColor = (tier: string) => {
    if (tier === 'Tanpa Level') return 'bg-surface-container-high text-text-secondary border-border';
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

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'Aktif': return 'bg-success/20 text-success';
      case 'Tidur': return 'bg-warning/20 text-warning';
      case 'Hilang': return 'bg-danger/20 text-danger';
      default: return 'bg-surface-variant text-text-secondary';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };
  
  const formatRp = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

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
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <span className="text-3xl font-bold text-primary-container">{formatRp(totalAllTimeSpent)}</span>
            <span className="text-text-secondary text-xs mt-1">sepanjang masa</span>
          </div>
        </div>

        {/* Highlight the top active member if top10 has items */}
        <div className="bg-surface border border-border p-6 rounded-xl hover:border-primary-container/50 transition-all duration-300">
          <p className="text-text-secondary text-[11px] font-semibold tracking-wider uppercase mb-3">MEMBER PALING LOYAL</p>
          {top10.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center border border-primary-container/40">
                <span className="text-primary-container font-bold text-lg">{getInitials(top10[0].name)}</span>
              </div>
              <div>
                <p className="text-text-primary font-bold text-sm leading-tight">{top10[0].name}</p>
                <p className="text-text-secondary text-xs">{top10[0].totalTransactions} total kunjungan</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-text-secondary">Belum ada transaksi</div>
          )}
        </div>
      </section>

      {/* Distribution & Table */}
      <section className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-lg font-bold text-text-primary">Daftar Semua Member</h3>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {selectedMembers.size > 0 && (
              <button onClick={() => handlePrint()} className="px-4 py-2 bg-primary-container text-on-primary-container hover:brightness-110 transition-colors text-sm font-bold rounded-lg flex items-center gap-2">
                <Download size={16} />
                Cetak {selectedMembers.size} Terpilih
              </button>
            )}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                className="bg-background border border-border focus:border-primary-container focus:ring-1 focus:ring-primary-container text-sm rounded-lg pl-9 pr-3 py-2 w-full md:w-64 outline-none text-text-primary transition-all" 
                placeholder="Cari nama atau telepon..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="hidden">Search</button>
            </form>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high text-text-secondary text-[11px] uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input type="checkbox" onChange={toggleSelectAll} checked={members.length > 0 && selectedMembers.size === members.length} className="w-4 h-4 cursor-pointer" />
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Member <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('segment')}>
                  <div className="flex items-center gap-1">Segmen <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-primary transition-colors text-right" onClick={() => handleSort('totalTransactions')}>
                  <div className="flex items-center justify-end gap-1">Kunjungan <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-primary transition-colors text-right" onClick={() => handleSort('totalSpent')}>
                  <div className="flex items-center justify-end gap-1">Total Belanja <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-primary transition-colors text-right" onClick={() => handleSort('avgSpent')}>
                  <div className="flex items-center justify-end gap-1">Rata-rata <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-primary transition-colors text-center" onClick={() => handleSort('lastSold')}>
                  <div className="flex items-center justify-center gap-1">Terakhir Belanja <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-secondary">Tidak ada data member yang sesuai.</td>
                </tr>
              ) : (
                members.map(member => (
                  <tr key={member.id} className="hover:bg-surface-variant transition-colors group">
                    <td className="px-6 py-4">
                      <input type="checkbox" onChange={() => toggleSelect(member.id)} checked={selectedMembers.has(member.id)} className="w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/laporan?member=${member.id}`} className="block">
                        <div className="font-bold text-text-primary group-hover:text-primary transition-colors">{member.name}</div>
                        <div className="text-xs text-text-secondary mt-0.5">{member.phone}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getSegmentColor(member.segment)}`}>
                        {member.segment}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-text-primary">
                      {member.totalTransactions}x
                    </td>
                    <td className="px-6 py-4 text-right text-primary-container font-medium">
                      {formatRp(member.totalSpent)}
                    </td>
                    <td className="px-6 py-4 text-right text-text-secondary text-xs">
                      {formatRp(member.avgSpent)}
                    </td>
                    <td className="px-6 py-4 text-center text-text-secondary text-xs">
                      {member.lastSold ? (
                        <>
                          <div className="font-medium text-text-primary">{format(new Date(member.lastSold), 'dd MMM yyyy', { locale: idLocale })}</div>
                          <div className="opacity-70">{format(new Date(member.lastSold), 'HH:mm', { locale: idLocale })}</div>
                        </>
                      ) : (
                        <span className="italic opacity-50">Belum pernah</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setSelectedMembers(new Set([member.id])); setTimeout(() => handlePrint(), 100); }} className="text-text-secondary hover:text-primary transition-colors p-1" title="Cetak Kartu">
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-surface-container-low">
            <span className="text-sm text-text-secondary">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => updateUrl({ page: Math.max(1, currentPage - 1) })}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => updateUrl({ page: Math.min(totalPages, currentPage + 1) })}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
        </>
      )}

      {/* Hidden Printable Component */}
      <div className="absolute opacity-0 -left-[9999px] -top-[9999px]">
        <PrintableMemberCards ref={printRef} cards={Array.from(selectedMembers).map(id => {
          const member = members.find(m => m.id === id);
          if (!member) return null;
          return {
            memberId: member.id,
            name: member.name,
            phone: member.phone,
            tierName: member.tier,
            tierColorClass: getTierColor(member.tier),
            storeName: storeProfile?.name || 'TokoKu',
            logoUrl: storeProfile?.logoUrl,
          };
        }).filter(Boolean) as MemberCardProps[]} />
      </div>
    </div>
  );
}
