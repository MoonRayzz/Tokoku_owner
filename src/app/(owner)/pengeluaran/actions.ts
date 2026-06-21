'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getExpenses(page: number = 1, limit: number = 20, search?: string, category?: string) {
  const whereClause: any = {};
  
  if (category && category !== 'all') {
    whereClause.category = category;
  }
  
  if (search) {
    whereClause.notes = { contains: search, mode: 'insensitive' };
  }

  const [expenses, totalCount] = await Promise.all([
    prisma.expense.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { employee: true, shift: true },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count({ where: whereClause })
  ]);

  return { expenses, totalCount };
}

export async function addExpense(formData: FormData) {
  try {
    const category = formData.get('category') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const notes = formData.get('notes') as string | null;

    const employeeId = formData.get('employeeId') as string;
    const shiftId = formData.get('shiftId') as string;

    if (!category || !amount || isNaN(amount) || amount <= 0 || !employeeId || !shiftId) {
      return { success: false, error: 'Data tidak valid. Semua form wajib diisi.' };
    }

    await prisma.expense.create({
      data: {
        category,
        amount,
        notes,
        employeeId: employeeId,
        shiftId: shiftId,
        syncStatus: 'SYNCED' // Di owner langsung disinkronisasi statusnya (cloud-first)
      }
    });

    revalidatePath('/pengeluaran');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteExpense(id: string) {
  try {
    await prisma.expense.delete({ where: { id } });
    revalidatePath('/pengeluaran');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
