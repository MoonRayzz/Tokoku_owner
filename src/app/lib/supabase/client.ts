import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: true,
      cookies: {
        get(name) {
          if (typeof document === 'undefined') return '';
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? decodeURIComponent(match[2]) : '';
        },
        set(name, value, options) {
          if (typeof document === 'undefined') return;
          const sessionOptions = { ...options };
          delete sessionOptions.maxAge;
          delete sessionOptions.expires;
          
          let cookieStr = `${name}=${encodeURIComponent(value)}; path=${sessionOptions.path || '/'}`;
          if (sessionOptions.domain) cookieStr += `; domain=${sessionOptions.domain}`;
          if (sessionOptions.sameSite) cookieStr += `; samesite=${sessionOptions.sameSite}`;
          if (sessionOptions.secure) cookieStr += `; secure`;
          document.cookie = cookieStr;
        },
        remove(name, options) {
          if (typeof document === 'undefined') return;
          document.cookie = `${name}=; path=${options?.path || '/'}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      }
    }
  );
}