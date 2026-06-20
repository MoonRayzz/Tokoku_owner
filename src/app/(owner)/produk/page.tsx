import { prisma } from '@/lib/db';
import ProductClient from './components/ProductClient';

export const dynamic = 'force-dynamic';

export default async function ProductPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: 'desc' }
  });

  return <ProductClient products={products} />;
}
