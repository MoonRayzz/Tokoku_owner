import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

async function verifyEmail() {
  try {
    const result = await prisma.$executeRawUnsafe(`UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'owner@tokoku.com';`);
    console.log("Email berhasil diverifikasi. Rows affected:", result);
  } catch (error) {
    console.error("Gagal verifikasi email:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyEmail();
