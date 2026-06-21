import { getExpenses } from './actions';
import ExpenseClient from './ExpenseClient';
import { PAGE_SIZE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function PengeluaranPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const pageParam = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const limit = PAGE_SIZE.PENGELUARAN;

  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';
  const category = typeof resolvedParams.category === 'string' ? resolvedParams.category : 'all';

  const { expenses, totalCount } = await getExpenses(page, limit, search, category);
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <ExpenseClient 
      expenses={expenses as any} 
      totalPages={totalPages}
      totalCount={totalCount}
      currentPage={page}
      limit={limit}
      initialSearch={search}
      initialCategory={category}
    />
  );
}
