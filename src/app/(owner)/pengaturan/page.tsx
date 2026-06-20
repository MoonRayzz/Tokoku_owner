import { createClient } from '@/app/lib/supabase/server';
import { redirect } from 'next/navigation';
import PengaturanClient from './components/PengaturanClient';

export default async function PengaturanPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <PengaturanClient initialEmail={user.email || ''} />
  );
}
