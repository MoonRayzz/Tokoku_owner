'use server';

import { revalidatePath } from 'next/cache';

export async function revalidateManifest() {
  revalidatePath('/manifest.json');
  revalidatePath('/manifest.webmanifest');
  return { success: true };
}
