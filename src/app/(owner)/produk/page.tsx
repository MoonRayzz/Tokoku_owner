import { prisma } from '@/lib/db';
import ProductClient from './components/ProductClient';

export const dynamic = 'force-dynamic';

export default async function ProductPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      StockLog: {
        orderBy: { date: 'desc' },
        take: 20
      }
    }
  });

  return <ProductClient products={products} />;
}
