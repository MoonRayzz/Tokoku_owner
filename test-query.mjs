import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data: p, error: ep } = await supabase.from('Product').select('*');
  console.log('Products:', p, ep);

  const { data: t, error: et } = await supabase.from('Transaction').select('*');
  console.log('Transactions:', t, et);
  
  const { data: s, error: es } = await supabase.from('StoreStatus').select('*');
  console.log('StoreStatus:', s, es);
}
main();
