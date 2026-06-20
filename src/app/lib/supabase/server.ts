import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const sessionOptions = { ...options };
              delete sessionOptions.maxAge;
              delete sessionOptions.expires;
              cookieStore.set(name, value, sessionOptions);
            });
          } catch {
            // Abaikan jika dipanggil dari Server Component
          }
        },
      },
    }
  );
}