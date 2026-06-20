require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Subscribing to StoreStatus...");
const channel = supabase
  .channel('public:StoreStatus')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'StoreStatus' }, payload => {
    console.log('Change received!', payload);
  })
  .subscribe();

// Keep alive
setTimeout(() => {
  console.log("Exiting after 30s");
  process.exit(0);
}, 30000);
