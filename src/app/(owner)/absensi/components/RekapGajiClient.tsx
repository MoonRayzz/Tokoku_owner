'use client';

import React, { useState, useMemo } from 'react';
import { Employee, Attendance, SalaryPayout } from '@prisma/client';
import { format, getMonth, getYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, Search, Download, CheckCircle2 } from 'lucide-react';
import { paySalary } from '../actions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface AttendanceWithRelations extends Attendance {
  employee: Employee;
}

interface RekapGajiClientProps {
  unpaidAttendances: AttendanceWithRelations[];
  employees: Employee[];
  salaryPayouts: (SalaryPayout & { employee: Employee; attendances: Attendance[] })[];
  storeName: string;
}

export default function RekapGajiClient({ unpaidAttendances, employees, salaryPayouts, storeName }: RekapGajiClientProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(getMonth(currentDate));
  const [selectedYear, setSelectedYear] = useState(getYear(currentDate));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'estimasi' | 'riwayat'>('estimasi');
  const [loadingPay, setLoadingPay] = useState<string | null>(null);
  
  const toast = useToast();
  const { confirm } = useConfirm();

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = useMemo(() => {
    const current = getYear(new Date());
    return [current - 1, current, current + 1];
  }, []);

  const rekapData = useMemo(() => {
    // 1. Filter unpaid attendances by selected month and year
    const filteredAttendances = unpaidAttendances.filter(att => {
      const attDate = new Date(att.date);
      return getMonth(attDate) === selectedMonth && getYear(attDate) === selectedYear;
    });

    // 2. Aggregate per employee
    const summary = employees.map(emp => {
      const empAttendances = filteredAttendances.filter(att => att.employeeId === emp.id);
      
      const totalHours = empAttendances.reduce((sum, att) => sum + (att.hoursWorked || 0), 0);
      const totalSalary = empAttendances.reduce((sum, att) => sum + (att.totalWage || 0), 0);
      const daysWorked = empAttendances.length;
      const attendanceIds = empAttendances.map(a => a.id);

      return {
        ...emp,
        totalHours: Math.round(totalHours * 10) / 10,
        totalSalary,
        daysWorked,
        attendanceIds
      };
    }).filter(emp => emp.totalSalary > 0); // Hanya tampilkan yang ada tagihan gaji belum dibayar

    // 3. Apply search filter
    return summary.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [unpaidAttendances, employees, selectedMonth, selectedYear, searchQuery]);

  const filteredPayouts = useMemo(() => {
    return salaryPayouts.filter(p => p.month === selectedMonth && p.year === selectedYear)
      .filter(p => p.employee.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [salaryPayouts, selectedMonth, selectedYear, searchQuery]);

  const totalOverallSalary = rekapData.reduce((sum, emp) => sum + emp.totalSalary, 0);

  const formatRp = (num: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const handlePayAndPrint = async (empData: any) => {
    const isConfirmed = await confirm({
      title: 'Konfirmasi Pembayaran',
      message: `Apakah Anda yakin ingin membayar gaji ${empData.name} sebesar ${formatRp(empData.totalSalary)} dan mencetak PDF?`,
      confirmLabel: 'Ya, Bayar & Cetak PDF',
      variant: 'info'
    });
    if (!isConfirmed) return;
    
    setLoadingPay(empData.id);
    const result = await paySalary(empData.id, selectedMonth, selectedYear, empData.totalSalary, empData.attendanceIds);
    setLoadingPay(null);

    if (result.success) {
      // Generate PDF
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text(`${storeName} - Slip Gaji Karyawan`, 14, 20);
      doc.setFontSize(11);
      doc.text(`Nama: ${empData.name}`, 14, 30);
      doc.text(`Periode: ${months[selectedMonth]} ${selectedYear}`, 14, 36);
      doc.text(`Tanggal Cetak: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 42);

      const tableData = [
        ['Total Hari Kerja', `${empData.daysWorked} hari`],
        ['Total Jam Kerja', `${empData.totalHours} jam`],
        ['Total Gaji Dibayarkan', formatRp(empData.totalSalary)],
      ];

      autoTable(doc, {
        startY: 50,
        head: [['Keterangan', 'Jumlah']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] }
      });

      doc.save(`Slip_Gaji_${empData.name.replace(/\s+/g, '_')}_${months[selectedMonth]}_${selectedYear}.pdf`);
      toast.success('Pembayaran gaji berhasil dicatat dan PDF diunduh.');
    } else {
      toast.error('Gagal memproses pembayaran gaji.');
    }
  };

  const handleReprintPdf = (payout: SalaryPayout & { employee: Employee; attendances: Attendance[] }) => {
    const doc = new jsPDF();
    const dateStr = format(new Date(payout.paidAt), 'dd MMMM yyyy HH:mm', { locale: id });
    
    // Hitung total jam kerja dan hari kerja dari relasi attendances
    const totalHours = payout.attendances.reduce((sum, att) => sum + (att.hoursWorked || 0), 0);
    const daysWorked = payout.attendances.length;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text(`${storeName} - Slip Gaji`, 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Periode: ${months[payout.month]} ${payout.year}`, 105, 28, { align: 'center' });

    // Detail Karyawan
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Nama: ${payout.employee.name}`, 14, 40);
    doc.text(`Waktu Cetak Ulang: ${dateStr}`, 14, 46);

    const tableData = [
      ['Total Hari Kerja', `${daysWorked} hari`],
      ['Total Jam Kerja', `${Math.round(totalHours * 10) / 10} jam`],
      ['Total Gaji Dibayarkan', formatRp(payout.amount)],
    ];

    autoTable(doc, {
      startY: 55,
      head: [['Keterangan', 'Jumlah']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80] }
    });

    doc.save(`Slip_Gaji_${payout.employee.name.replace(/\s+/g, '_')}_${months[payout.month]}_${payout.year}.pdf`);
    toast.success('PDF berhasil dicetak ulang.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Filters */}
      <div className="bg-surface rounded-xl border border-border p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-background border border-border rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-container"
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-background border border-border rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-container"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <input 
            type="text" 
            placeholder="Cari karyawan..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-container"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Periode Terpilih</p>
            <p className="text-lg font-bold text-text-primary">{months[selectedMonth]} {selectedYear}</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="font-bold text-xl">Rp</span>
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Estimasi Total Gaji</p>
            <p className="text-lg font-bold text-text-primary">{formatRp(totalOverallSalary)}</p>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex space-x-2 border-b border-border pb-2">
        <button 
          onClick={() => setActiveTab('estimasi')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'estimasi' ? 'bg-primary-container text-on-primary-container' : 'text-text-secondary hover:bg-surface-container-low'}`}
        >
          Estimasi Belum Dibayar
        </button>
        <button 
          onClick={() => setActiveTab('riwayat')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'riwayat' ? 'bg-primary-container text-on-primary-container' : 'text-text-secondary hover:bg-surface-container-low'}`}
        >
          Riwayat Pembayaran
        </button>
      </div>

      {/* Table Estimasi */}
      {activeTab === 'estimasi' && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border">
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Karyawan</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-center">Hari Kerja</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-center">Total Jam</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right whitespace-nowrap">Estimasi Gaji</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rekapData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-text-secondary">
                    Tidak ada data absen di periode ini.
                  </td>
                </tr>
              ) : (
                rekapData.map((data, idx) => (
                  <tr key={data.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-text-primary">{data.name}</div>
                      <div className="text-xs text-text-secondary capitalize">{data.role}</div>
                    </td>
                    <td className="p-4 text-center text-text-primary font-medium">
                      {data.daysWorked} <span className="text-text-secondary text-xs font-normal">hari</span>
                    </td>
                    <td className="p-4 text-center text-text-primary font-medium">
                      {data.totalHours} <span className="text-text-secondary text-xs font-normal">jam</span>
                    </td>
                    <td className="p-4 text-right font-bold text-primary-container whitespace-nowrap">
                      {formatRp(data.totalSalary)}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <button 
                        onClick={() => handlePayAndPrint(data)}
                        disabled={loadingPay === data.id}
                        className="bg-primary-container hover:bg-primary text-on-primary-container px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {loadingPay === data.id ? 'Memproses...' : <><Download size={16} /> Bayar & Cetak PDF</>}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Table Riwayat */}
      {activeTab === 'riwayat' && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-container-low text-xs font-medium text-text-secondary uppercase tracking-wider text-left">
                <th className="p-4 py-3 font-medium rounded-tl-xl">Karyawan</th>
                <th className="p-4 py-3 font-medium">Periode Gaji</th>
                <th className="p-4 py-3 font-medium">Total Dibayar</th>
                <th className="p-4 py-3 font-medium">Waktu Bayar</th>
                <th className="p-4 py-3 font-medium">Status</th>
                <th className="p-4 py-3 font-medium text-right rounded-tr-xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-secondary">
                      Tidak ada riwayat pembayaran di periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4 py-3 align-middle font-bold text-text-primary">{payout.employee.name}</td>
                      <td className="p-4 py-3 align-middle text-sm text-text-secondary">{months[payout.month]} {payout.year}</td>
                      <td className="p-4 py-3 align-middle font-bold text-primary-container">{formatRp(payout.amount)}</td>
                      <td className="p-4 py-3 align-middle text-sm text-text-secondary">{format(new Date(payout.paidAt), 'dd MMM yyyy, HH:mm', { locale: id })}</td>
                      <td className="p-4 py-3 align-middle">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/10 text-success text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Lunas
                        </span>
                      </td>
                      <td className="p-4 py-3 align-middle text-right">
                        <button
                          onClick={() => handleReprintPdf(payout)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface-container-high hover:text-text-primary transition-colors text-xs font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Cetak PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
