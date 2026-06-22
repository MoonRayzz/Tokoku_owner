'use client';

import React, { useState } from 'react';
import { checkTodayStatus, submitCheckIn, submitCheckOut } from '../actions';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface Employee { id: string; name: string; wageBase: number; wageSolo: number; }
interface Shift { id: string; name: string; startTime: string; endTime: string; }
interface StoreProfile { latitude: number | null; longitude: number | null; radius: number; }

type AttendanceStatus = 'idle' | 'checked-in' | 'checked-out';

export default function AbsenClient({ employees, shifts, storeProfile }: { employees: Employee[], shifts: Shift[], storeProfile: StoreProfile | null }) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>('idle');
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper function to safely get start of day in client's timezone
  const getClientStartOfDayIso = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return startOfDay.toISOString();
  };

  const detectCurrentShift = (): Shift | null => {
    if (shifts.length === 0) return null;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let closestShift: Shift | null = null;
    let minDiff = Infinity;

    for (const s of shifts) {
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;
      if (endMinutes < startMinutes) endMinutes += 24 * 60; // Overnight shift

      let checkMinutes = currentMinutes;
      if (endMinutes > 24 * 60 && currentMinutes < startMinutes) {
          checkMinutes += 24 * 60;
      }

      // Toleransi 90 menit sebelum mulai dan 90 menit setelah selesai
      if (checkMinutes >= startMinutes - 90 && checkMinutes <= endMinutes + 90) {
        return s;
      }
      
      const diff = Math.abs(checkMinutes - startMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closestShift = s;
      }
    }
    
    return closestShift || shifts[0] || null;
  };

  const handleSelectEmployee = async (empId: string) => {
    const emp = employees.find(x => x.id === empId);
    if (!emp) return;
    
    setSelectedEmployee(emp);
    setCurrentShift(detectCurrentShift());
    setSuccess(null);
    setError(null);
    setNotes('');
    setLoading(true);

    const result = await checkTodayStatus(emp.id, getClientStartOfDayIso());
    setStatus(result.status as AttendanceStatus);
    setAttendanceId(result.attendanceId);
    setLoading(false);
  };

  const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);
    var dLon = deg2rad(lon2-lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return Math.round(d * 1000); // Distance in meters
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI/180);
  };

  const verifyLocation = async (): Promise<boolean> => {
    if (!storeProfile || !storeProfile.latitude || !storeProfile.longitude) {
      // Jika owner belum mengatur koordinat, izinkan saja
      return true;
    }
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Browser Anda tidak mendukung deteksi lokasi (GPS).');
        setLoading(false);
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const dist = getDistanceFromLatLonInM(
            pos.coords.latitude, 
            pos.coords.longitude, 
            storeProfile.latitude!, 
            storeProfile.longitude!
          );
          
          if (dist > storeProfile.radius) {
            setError(`📍 Absen ditolak! Anda berada di luar jangkauan absen. (Jarak Anda: ${dist}m, Maks: ${storeProfile.radius}m)`);
            setLoading(false);
            resolve(false);
          } else {
            resolve(true);
          }
        },
        (err) => {
          setError('📍 Gagal mendapatkan lokasi GPS. Pastikan izin lokasi diaktifkan pada browser/perangkat Anda.');
          setLoading(false);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleCheckIn = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    setError(null);

    const isLocationValid = await verifyLocation();
    if (!isLocationValid) return;

    if (status === 'idle') {
      const result = await submitCheckIn(selectedEmployee.id, currentShift?.id || null, notes, getClientStartOfDayIso(), new Date().toISOString());
      
      if (result.success && result.attendanceId) {
        setAttendanceId(result.attendanceId);
        setStatus('checked-in');
        setSuccess(`✅ ${selectedEmployee.name} berhasil MASUK pukul ${format(new Date(), 'HH:mm')}`);
        setNotes('');
      } else {
        setError('Gagal mencatat kehadiran. Coba lagi.');
      }
    }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    if (!selectedEmployee || !attendanceId) return;
    setLoading(true);
    setError(null);

    const isLocationValid = await verifyLocation();
    if (!isLocationValid) return;

    if (status === 'checked-in' && attendanceId) {
      const result = await submitCheckOut(attendanceId, notes, getClientStartOfDayIso(), new Date().toISOString());
      
      if (result.success) {
        setStatus('checked-out');
        setSuccess(
          `✅ ${selectedEmployee.name} PULANG pukul ${format(new Date(), 'HH:mm')}. ` +
          `Kerja ${result.hoursWorked} jam. Upah: Rp ${(result.totalWage || 0).toLocaleString('id-ID')}` +
          (result.isSolo ? ' (Tarif Solo 🌟)' : '')
        );
        setNotes('');
      } else {
        setError('Gagal mencatat kepulangan. Coba lagi. ' + result.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface-container flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary">📋 Absensi TokoKu</h1>
          <p className="text-sm text-text-secondary mt-1">
            {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
          </p>
          {currentShift && (
            <span className="inline-block mt-3 bg-primary-container/20 border border-primary-container/30 text-primary-container text-xs px-3 py-1 rounded-full font-medium">
              🕐 Shift Aktif: {currentShift.name} ({currentShift.startTime} - {currentShift.endTime})
            </span>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-2">
            Pilih Nama Karyawan
          </label>
          <select
            onChange={e => handleSelectEmployee(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary-container transition-all"
            defaultValue=""
          >
            <option value="" disabled>-- Pilih nama kamu --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        {selectedEmployee && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-center">
              {loading && status === 'idle' ? (
                <span className="text-text-secondary text-sm">Memeriksa status...</span>
              ) : (
                <>
                  {status === 'idle' && (
                    <span className="bg-surface-container-highest text-text-secondary px-4 py-2 rounded-full text-sm font-semibold border border-border">
                      Belum absen hari ini
                    </span>
                  )}
                  {status === 'checked-in' && (
                    <span className="bg-primary-container/10 border border-primary-container/20 text-primary-container px-4 py-2 rounded-full text-sm font-semibold">
                      ✅ Sedang Bekerja (Belum Pulang)
                    </span>
                  )}
                  {status === 'checked-out' && (
                    <span className="bg-secondary/10 border border-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-semibold">
                      ✅ Absensi Hari Ini Selesai
                    </span>
                  )}
                </>
              )}
            </div>

            {status !== 'checked-out' && (
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-2">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Misal: Datang terlambat karena hujan"
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary-container resize-none"
                />
              </div>
            )}

            {status === 'idle' && (
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="w-full bg-primary-container hover:bg-primary text-on-primary-container font-bold py-4 rounded-xl text-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'MASUK SEKARANG'}
              </button>
            )}

            {status === 'checked-in' && (
              <button
                onClick={handleCheckOut}
                disabled={loading}
                className="w-full bg-error hover:bg-error/90 text-on-error font-bold py-4 rounded-xl text-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'PULANG SEKARANG'}
              </button>
            )}
          </div>
        )}

        {success && (
          <div className="bg-primary-container/10 border border-primary-container/30 rounded-xl p-4 text-sm text-primary-container text-center font-medium animate-in fade-in duration-300">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-sm text-error text-center font-medium animate-in fade-in duration-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
