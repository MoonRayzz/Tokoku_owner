'use client';

import React, { useState } from 'react';
import { Employee, Shift, Attendance } from '@prisma/client';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Users, Clock, CalendarDays, Wallet, Plus, Edit, X, Download, Filter, Trash2 } from 'lucide-react';
import { saveEmployee, saveShift } from '../actions';
import QRGenerator from './QRGenerator';
import { useToast } from '@/components/ui/Toast';
import RekapGajiClient from './RekapGajiClient';
import Pagination from '@/components/ui/Pagination';

interface AttendanceWithRelations extends Attendance {
  employee: Employee;
  shift: Shift | null;
}

interface AbsensiClientProps {
  attendances: AttendanceWithRelations[];
  employees: Employee[];
  shifts: Shift[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
  limit: number;
}

export default function AbsensiClient({ attendances, employees, shifts, totalPages, totalCount, currentPage, limit }: AbsensiClientProps) {
  const [activeTab, setActiveTab] = useState<'riwayat' | 'karyawan' | 'shift' | 'rekap'>('riwayat');
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const openEmpModal = (emp?: Employee) => {
    setEditingEmp(emp || null);
    setIsEmpModalOpen(true);
  };

  const openShiftModal = (shift?: Shift) => {
    setEditingShift(shift || null);
    setIsShiftModalOpen(true);
  };

  const closeModals = () => {
    setIsEmpModalOpen(false);
    setIsShiftModalOpen(false);
    setEditingEmp(null);
    setEditingShift(null);
  };

  const handleEmpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (editingEmp) formData.append('id', editingEmp.id);
    
    const result = await saveEmployee(formData);
    setLoading(false);
    if (result.success) {
      toast.success("Karyawan berhasil disimpan!");
      closeModals();
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteEmp = async (emp: Employee) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus (menonaktifkan) karyawan ${emp.name}? Riwayat absensinya akan tetap tersimpan.`)) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('id', emp.id);
    formData.append('name', emp.name);
    formData.append('phone', emp.phone || '');
    formData.append('role', emp.role);
    formData.append('wageBase', emp.wageBase.toString());
    formData.append('wageSolo', emp.wageSolo.toString());
    formData.append('isActive', 'false'); // Set to nonaktif
    await saveEmployee(formData);
    setLoading(false);
  };

  const handleShiftSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (editingShift) formData.append('id', editingShift.id);
    
    const result = await saveShift(formData);
    setLoading(false);
    if (result.success) {
      toast.success("Shift berhasil disimpan!");
      closeModals();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Sistem Absensi</h2>
        <p className="text-text-secondary text-sm">Kelola data karyawan, jadwal shift, dan rekap kehadiran</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar space-x-1 bg-surface-container-low p-1 rounded-xl border border-border">
        <button 
          onClick={() => setActiveTab('riwayat')}
          className={`whitespace-nowrap flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'riwayat' ? 'bg-surface text-primary-container shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'}`}
        >
          <CalendarDays size={18} />
          Riwayat Kehadiran
        </button>
        <button 
          onClick={() => setActiveTab('karyawan')}
          className={`whitespace-nowrap flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'karyawan' ? 'bg-surface text-primary-container shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'}`}
        >
          <Users size={18} />
          Data Karyawan
        </button>
        <button 
          onClick={() => setActiveTab('shift')}
          className={`whitespace-nowrap flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'shift' ? 'bg-surface text-primary-container shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'}`}
        >
          <Clock size={18} />
          Jadwal Shift
        </button>
        <button 
          onClick={() => setActiveTab('rekap')}
          className={`whitespace-nowrap flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'rekap' ? 'bg-surface text-primary-container shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'}`}
        >
          <Wallet size={18} />
          Rekap Gaji
        </button>
      </div>

      {/* Tab Content: Rekap Gaji */}
      {activeTab === 'rekap' && (
        <RekapGajiClient attendances={attendances} employees={employees} />
      )}

      {/* Tab Content: Riwayat */}
      {activeTab === 'riwayat' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-surface rounded-xl border border-border p-6 flex flex-col justify-center">
              <h3 className="text-lg font-bold text-text-primary mb-2">Ringkasan Hari Ini</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary-container/10 border border-primary-container/20 rounded-xl p-4">
                  <p className="text-[11px] font-semibold tracking-wider text-text-secondary uppercase">Hadir</p>
                  <p className="text-2xl md:text-3xl font-bold text-primary-container mt-1">
                    {new Set(attendances.filter(a => a.checkIn && new Date(a.checkIn).toDateString() === new Date().toDateString()).map(a => a.employeeId)).size} org
                  </p>
                </div>
                <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4">
                  <p className="text-[11px] font-semibold tracking-wider text-text-secondary uppercase">Total Upah</p>
                  <p className="text-2xl md:text-3xl font-bold text-secondary mt-1 whitespace-nowrap">
                    Rp {attendances.filter(a => a.checkIn && new Date(a.checkIn).toDateString() === new Date().toDateString()).reduce((sum, a) => sum + (a.totalWage || 0), 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>
            <div className="md:col-span-1">
              <QRGenerator />
            </div>
          </div>
          
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-text-primary">Riwayat Kehadiran Terakhir</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high text-text-secondary text-[11px] uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Tanggal</th>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Karyawan</th>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Shift</th>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Check In</th>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Check Out</th>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Total Upah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendances.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-text-secondary">Belum ada data absensi.</td></tr>
                ) : (
                  attendances.map(a => (
                    <tr key={a.id} className="hover:bg-surface-container transition-colors">
                      <td className="px-4 md:px-6 py-4 font-semibold text-text-primary whitespace-nowrap">
                        {format(new Date(a.date), 'dd MMM yyyy', { locale: id })}
                      </td>
                      <td className="px-4 md:px-6 py-4 font-bold text-text-primary whitespace-nowrap">{a.employee.name}</td>
                      <td className="px-4 md:px-6 py-4 text-text-secondary whitespace-nowrap">{a.shift?.name || '-'}</td>
                      <td className="px-4 md:px-6 py-4 text-primary-container font-semibold whitespace-nowrap">
                        {a.checkIn ? format(new Date(a.checkIn), 'HH:mm') : '-'}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-warning font-semibold whitespace-nowrap">
                        {a.checkOut ? format(new Date(a.checkOut), 'HH:mm') : '-'}
                      </td>
                      <td className="px-4 md:px-6 py-4 font-bold text-text-primary whitespace-nowrap">
                        {a.totalWage ? `Rp ${a.totalWage.toLocaleString('id-ID')}` : '-'}
                        {a.isSolo && <span className="ml-2 text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded">SOLO</span>}
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
      )}

      {/* Tab Content: Karyawan */}
      {activeTab === 'karyawan' && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold text-text-primary">Data Karyawan</h3>
            <button 
              onClick={() => openEmpModal()}
              className="bg-primary-container hover:bg-primary text-on-primary-container font-semibold px-4 h-9 rounded-lg flex items-center text-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" /> Tambah Karyawan
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high text-text-secondary text-[11px] uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Nama</th>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Role</th>
                  <th className="px-4 md:px-6 py-4 font-semibold text-right whitespace-nowrap">Upah Dasar (Shift)</th>
                  <th className="px-4 md:px-6 py-4 font-semibold text-right whitespace-nowrap">Upah Jaga Sendiri</th>
                  <th className="px-4 md:px-6 py-4 font-semibold text-center whitespace-nowrap">Status</th>
                  <th className="px-4 md:px-6 py-4 font-semibold text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-text-primary">{emp.name}</div>
                      <div className="text-xs text-text-secondary">{emp.phone || '-'}</div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-sm capitalize whitespace-nowrap">{emp.role}</td>
                    <td className="px-4 md:px-6 py-4 text-right font-semibold text-primary-container whitespace-nowrap">Rp {emp.wageBase.toLocaleString('id-ID')}</td>
                    <td className="px-4 md:px-6 py-4 text-right font-semibold text-secondary whitespace-nowrap">Rp {emp.wageSolo.toLocaleString('id-ID')}</td>
                    <td className="px-4 md:px-6 py-4 text-center whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${emp.isActive ? 'bg-primary-container/10 text-primary-container border border-primary-container/20' : 'bg-surface-container-highest text-text-secondary border border-border'}`}>
                        {emp.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEmpModal(emp)} className="p-2 text-text-secondary hover:text-primary-container rounded-lg" title="Edit">
                          <Edit size={16} />
                        </button>
                        {emp.isActive && (
                          <button onClick={() => handleDeleteEmp(emp)} className="p-2 text-text-secondary hover:text-error rounded-lg" title="Hapus / Nonaktifkan">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Shift */}
      {activeTab === 'shift' && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold text-text-primary">Jadwal Shift</h3>
            <button 
              onClick={() => openShiftModal()}
              className="bg-primary-container hover:bg-primary text-on-primary-container font-semibold px-4 h-9 rounded-lg flex items-center text-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" /> Tambah Shift
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high text-text-secondary text-[11px] uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Nama Shift</th>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Jam Mulai</th>
                  <th className="px-4 md:px-6 py-4 font-semibold whitespace-nowrap">Jam Selesai</th>
                  <th className="px-4 md:px-6 py-4 font-semibold text-center whitespace-nowrap">Status</th>
                  <th className="px-4 md:px-6 py-4 font-semibold text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shifts.map(shift => (
                  <tr key={shift.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-4 md:px-6 py-4 font-bold text-text-primary whitespace-nowrap">{shift.name}</td>
                    <td className="px-4 md:px-6 py-4 text-text-secondary font-semibold whitespace-nowrap">{shift.startTime}</td>
                    <td className="px-4 md:px-6 py-4 text-text-secondary font-semibold whitespace-nowrap">{shift.endTime}</td>
                    <td className="px-4 md:px-6 py-4 text-center whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${shift.isActive ? 'bg-primary-container/10 text-primary-container border border-primary-container/20' : 'bg-surface-container-highest text-text-secondary border border-border'}`}>
                        {shift.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-center whitespace-nowrap">
                      <button onClick={() => openShiftModal(shift)} className="p-2 text-text-secondary hover:text-primary-container rounded-lg">
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Karyawan */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">{editingEmp ? 'Ubah Karyawan' : 'Tambah Karyawan'}</h3>
              <button onClick={closeModals} className="p-1 text-text-secondary hover:text-text-primary rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleEmpSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Nama Karyawan</label>
                <input name="name" defaultValue={editingEmp?.name} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">No. Handphone (Opsional)</label>
                <input name="phone" defaultValue={editingEmp?.phone || ''} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Upah Per Shift</label>
                  <input type="number" name="wageBase" defaultValue={editingEmp?.wageBase || 0} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Upah Jaga Sendiri</label>
                  <input type="number" name="wageSolo" defaultValue={editingEmp?.wageSolo || 0} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" name="isActive" value="true" defaultChecked={editingEmp ? editingEmp.isActive : true} className="w-4 h-4 rounded border-border bg-background text-primary-container focus:ring-primary-container" />
                <label className="text-sm text-text-primary">Karyawan Aktif</label>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-primary-container hover:bg-primary text-on-primary-container font-semibold py-2.5 rounded-lg mt-4">{loading ? 'Menyimpan...' : 'Simpan Karyawan'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Shift */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">{editingShift ? 'Ubah Shift' : 'Tambah Shift'}</h3>
              <button onClick={closeModals} className="p-1 text-text-secondary hover:text-text-primary rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleShiftSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase">Nama Shift (Contoh: Shift Pagi)</label>
                <input name="name" defaultValue={editingShift?.name} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Jam Mulai</label>
                  <input type="time" name="startTime" defaultValue={editingShift?.startTime} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Jam Selesai</label>
                  <input type="time" name="endTime" defaultValue={editingShift?.endTime} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-container" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" name="isActive" value="true" defaultChecked={editingShift ? editingShift.isActive : true} className="w-4 h-4 rounded border-border bg-background text-primary-container focus:ring-primary-container" />
                <label className="text-sm text-text-primary">Shift Aktif</label>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-primary-container hover:bg-primary text-on-primary-container font-semibold py-2.5 rounded-lg mt-4">{loading ? 'Menyimpan...' : 'Simpan Shift'}</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
