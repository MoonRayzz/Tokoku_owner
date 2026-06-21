'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getExpenses(page: number = 1, limit: number = 20) {
  const [expenses, totalCount] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { date: 'desc' },
      include: { employee: true },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count()
  ]);

  return { expenses, totalCount };
}

export async function addExpense(formData: FormData) {
  try {
    const category = formData.get('category') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const notes = formData.get('notes') as string | null;

    if (!category || !amount || isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Data tidak valid' };
    }

    let employee = await prisma.employee.findFirst({ where: { role: 'owner' } });
    if (!employee) {
      employee = await prisma.employee.create({
        data: { name: 'Owner', role: 'owner', isActive: true }
      });
    }

    await prisma.expense.create({
      data: {
        category,
        amount,
        notes,
        employeeId: employee.id,
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
