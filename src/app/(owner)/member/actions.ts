'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function saveTier(formData: FormData) {
  try {
    const id = formData.get('id') as string | null;
    const name = formData.get('name') as string;
    const minTransactions = parseInt(formData.get('minTransactions') as string);
    const minTotalSpent = parseFloat(formData.get('minTotalSpent') as string) || 0;
    const minOrderAmount = parseFloat(formData.get('minOrderAmount') as string);
    const discountPercentage = parseFloat(formData.get('discountPercentage') as string);
    const maxDiscountAmount = parseFloat(formData.get('maxDiscountAmount') as string);

    if (!name) return { success: false, error: 'Nama Level wajib diisi.' };

    const data = {
      name,
      minTransactions,
      minTotalSpent,
      minOrderAmount,
      discountPercentage,
      maxDiscountAmount,
    };

    if (id) {
      await prisma.memberTier.update({
        where: { id },
        data
      });
    } else {
      await prisma.memberTier.create({
        data
      });
    }

    revalidatePath('/member');
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Nama Level sudah ada.' };
    }
    return { success: false, error: error.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function deleteTier(id: string) {
  try {
    await prisma.memberTier.delete({
      where: { id }
    });
    revalidatePath('/member');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus level.' };
  }
}
