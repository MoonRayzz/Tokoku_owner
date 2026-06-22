import { createClient } from '@/app/lib/supabase/server';
import { redirect } from 'next/navigation';
import BukuUtangClient from './BukuUtangClient';

export const dynamic = 'force-dynamic';

export default async function BukuUtangPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Ambil semua data utang beserta cicilannya
  const { data: debts, error: debtsError } = await supabase
    .from('Debt')
    .select(`
      *,
      transaction:Transaction!inner(receiptNumber, isVoid),
      payments:DebtPayment(*)
    `)
    .eq('transaction.isVoid', false)
    .order('createdAt', { ascending: false });

  if (debtsError) {
    console.error('Error loading debts:', debtsError);
  }

  return <BukuUtangClient initialDebts={debts || []} />;
}
