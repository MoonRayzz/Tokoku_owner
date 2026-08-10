'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updateProduct(formData: FormData) {
  try {
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const sku = formData.get('sku') as string;
    const priceRetail = parseFloat(formData.get('priceRetail') as string);
    const priceBuyStr = formData.get('priceBuy') as string;
    const priceBuy = priceBuyStr ? parseFloat(priceBuyStr) : null;
    const stock = parseInt(formData.get('stock') as string);
    const priceWholesaleStr = formData.get('priceWholesale') as string;
    const wholesaleMinQtyStr = formData.get('wholesaleMinQty') as string;
    const minStockAlert = parseInt(formData.get('minStockAlert') as string) || 5;

    const priceWholesale = priceWholesaleStr ? parseFloat(priceWholesaleStr) : null;
    const wholesaleMinQty = wholesaleMinQtyStr ? parseInt(wholesaleMinQtyStr) : null;
    const barcodeRaw = formData.get('barcode') as string;
    const barcode = barcodeRaw && barcodeRaw.trim() ? barcodeRaw.trim() : null;

    if (!id) {
      return { success: false, error: 'ID produk tidak ditemukan.' };
    }

    await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        barcode,
        priceBuy,
        priceRetail,
        priceWholesale,
        wholesaleMinQty,
        stock,
        minStockAlert
      }
    });

    revalidatePath('/produk');
    return { success: true };
  } catch (error: any) {
    console.error('Error update produk:', error);
    return { success: false, error: error.message };
  }
}
