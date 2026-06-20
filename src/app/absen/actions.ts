'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function checkTodayStatus(employeeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await prisma.attendance.findFirst({
    where: {
      employeeId,
      date: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    }
  });

  if (!attendance) return { status: 'idle', attendanceId: null };
  if (attendance.checkIn && !attendance.checkOut) return { status: 'checked-in', attendanceId: attendance.id };
  return { status: 'checked-out', attendanceId: attendance.id };
}

export async function submitCheckIn(employeeId: string, shiftId: string | null, notes: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        shiftId,
        date: today,
        checkIn: now,
        notes: notes || null
      }
    });
    
    revalidatePath('/absen');
    return { success: true, attendanceId: attendance.id };
  } catch (error: any) {
    console.error("Check-in error:", error);
    return { success: false, error: error.message };
  }
}

export async function submitCheckOut(attendanceId: string, notes: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    // Find the attendance record
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { employee: true }
    });

    if (!attendance || !attendance.checkIn) throw new Error("Data absensi tidak valid");

    // Check how many people checked in today to determine 'isSolo'
    const todayAttendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        checkIn: { not: null }
      }
    });

    const isSolo = todayAttendances.length === 1;

    // Calculate hours worked
    const checkInTime = new Date(attendance.checkIn);
    const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    
    // Choose wage
    const wageUsed = isSolo ? attendance.employee.wageSolo : attendance.employee.wageBase;
    const totalWage = Math.round(hoursWorked * wageUsed);

    await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        checkOut: now,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        wageUsed,
        totalWage,
        isSolo,
        notes: notes ? (attendance.notes ? `${attendance.notes} | Checkout: ${notes}` : notes) : attendance.notes
      }
    });

    revalidatePath('/absen');
    return { 
      success: true, 
      hoursWorked: hoursWorked.toFixed(1),
      totalWage,
      isSolo
    };

  } catch (error: any) {
    console.error("Check-out error:", error);
    return { success: false, error: error.message };
  }
}
