import { getExpenses } from './actions';
import ExpenseClient from './ExpenseClient';

export const dynamic = 'force-dynamic';

export default async function PengeluaranPage() {
  const expenses = await getExpenses();

  return (
    <ExpenseClient expenses={expenses as any} />
  );
}
