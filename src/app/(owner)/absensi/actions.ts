'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function saveEmployee(formData: FormData) {
  const id = formData.get('id') as string | null;
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const role = formData.get('role') as string || 'karyawan';
  const isActive = formData.get('isActive') === 'true';
  const wageBase = parseFloat(formData.get('wageBase') as string);
  const wageSolo = parseFloat(formData.get('wageSolo') as string);

  try {
    if (id) {
      await prisma.employee.update({
        where: { id },
        data: { name, phone, role, isActive, wageBase, wageSolo }
      });
    } else {
      await prisma.employee.create({
        data: { name, phone, role, isActive, wageBase, wageSolo }
      });
    }
    revalidatePath('/absensi');
    return { success: true };
  } catch (error: any) {
    console.error("Save employee error:", error);
    return { success: false, error: error.message };
  }
}

export async function saveShift(formData: FormData) {
  const id = formData.get('id') as string | null;
  const name = formData.get('name') as string;
  const startTime = formData.get('startTime') as string;
  const endTime = formData.get('endTime') as string;
  const isActive = formData.get('isActive') === 'true';

  try {
    if (id) {
      await prisma.shift.update({
        where: { id },
        data: { name, startTime, endTime, isActive }
      });
    } else {
      await prisma.shift.create({
        data: { name, startTime, endTime, isActive }
      });
    }
    revalidatePath('/absensi');
    return { success: true };
  } catch (error: any) {
    console.error("Save shift error:", error);
    return { success: false, error: error.message };
  }
}
