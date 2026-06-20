import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  console.log("Products in Supabase:", products.length);
  
  const txs = await prisma.transaction.findMany();
  console.log("Txs in Supabase:", txs.length);
}
main().finally(() => prisma.$disconnect());
