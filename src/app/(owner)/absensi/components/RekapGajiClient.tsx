'use client';

import React, { useState, useMemo } from 'react';
import { Employee, Attendance } from '@prisma/client';
import { format, getMonth, getYear, setMonth, setYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, Search, Download } from 'lucide-react';

interface AttendanceWithRelations extends Attendance {
  employee: Employee;
}

interface RekapGajiClientProps {
  attendances: AttendanceWithRelations[];
  employees: Employee[];
}

export default function RekapGajiClient({ attendances, employees }: RekapGajiClientProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(getMonth(currentDate));
  const [selectedYear, setSelectedYear] = useState(getYear(currentDate));
  const [searchQuery, setSearchQuery] = useState('');

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = useMemo(() => {
    const current = getYear(new Date());
    return [current - 1, current, current + 1];
  }, []);

  const rekapData = useMemo(() => {
    // 1. Filter attendances by selected month and year
    const filteredAttendances = attendances.filter(att => {
      const attDate = new Date(att.date);
      return getMonth(attDate) === selectedMonth && getYear(attDate) === selectedYear;
    });

    // 2. Aggregate per employee
    const summary = employees.map(emp => {
      const empAttendances = filteredAttendances.filter(att => att.employeeId === emp.id);
      
      const totalHours = empAttendances.reduce((sum, att) => sum + (att.hoursWorked || 0), 0);
      const totalSalary = empAttendances.reduce((sum, att) => sum + (att.totalWage || 0), 0);
      const daysWorked = empAttendances.length;

      return {
        ...emp,
        totalHours: Math.round(totalHours * 10) / 10,
        totalSalary,
        daysWorked
      };
    });

    // 3. Apply search filter
    return summary.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [attendances, employees, selectedMonth, selectedYear, searchQuery]);

  const totalOverallSalary = rekapData.reduce((sum, emp) => sum + emp.totalSalary, 0);

  const formatRp = (num: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

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

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border">
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Karyawan</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-center">Hari Kerja</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-center">Total Jam</th>
                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Estimasi Gaji</th>
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
                    <td className="p-4 text-right font-bold text-primary-container">
                      {formatRp(data.totalSalary)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
