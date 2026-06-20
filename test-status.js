const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Volumes/DATA/PROJECT 2026/Toko_Ku/app-toko-lokal/.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function check() {
  const { data, error } = await supabase.from('StoreStatus').select('*');
  console.log(data, error);
}
check();
