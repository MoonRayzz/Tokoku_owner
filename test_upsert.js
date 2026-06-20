require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('StoreStatus').upsert({
    id: 'local-store',
    lastPing: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log("Upsert Data:", data, "Error:", error);
}
run();
