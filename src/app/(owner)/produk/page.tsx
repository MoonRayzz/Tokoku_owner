import { prisma } from '@/lib/db';
import ProductClient from './components/ProductClient';
import { PAGE_SIZE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function ProductPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const pageParam = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const searchParam = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';

  const limit = PAGE_SIZE.PRODUK;

  const whereClause: any = searchParam ? {
    OR: [
      { name: { contains: searchParam, mode: 'insensitive' } },
      { sku: { contains: searchParam, mode: 'insensitive' } },
      { barcode: { contains: searchParam, mode: 'insensitive' } }
    ]
  } : {};

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        StockLog: {
          orderBy: { date: 'desc' },
          take: 20
        }
      }
    }),
    prisma.product.count({ where: whereClause })
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return <ProductClient 
    products={products} 
    totalPages={totalPages} 
    totalCount={totalCount} 
    currentPage={page} 
    limit={limit} 
    initialSearch={searchParam}
  />;
}
