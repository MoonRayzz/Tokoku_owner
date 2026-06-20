import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Gagal: NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan di .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Sedang mendaftarkan owner@tokoku.com...");
  const { data, error } = await supabase.auth.signUp({
    email: 'owner@tokoku.com',
    password: '123456789',
  });

  if (error) {
    console.error("Terjadi kesalahan:", error.message);
  } else {
    console.log("Berhasil mendaftarkan admin@owner.com!");
    if (data.user?.identities?.length === 0) {
      console.log("Catatan: User ini mungkin sudah pernah didaftarkan sebelumnya.");
    }
    console.log("Silakan coba login dengan kredensial tersebut.");
  }
}

seed();
