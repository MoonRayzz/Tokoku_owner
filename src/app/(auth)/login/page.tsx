'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    async function loadLogo() {
      try {
        const { data } = await supabase.from('StoreProfile').select('logoUrl').eq('id', 'local-store').single();
        if (data && data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      } catch (err) {
        // ignore
      }
    }
    loadLogo();
  }, [supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (signInError) {
      setError('Email atau password salah. Pastikan kredensial yang Anda masukkan benar.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background w-full flex items-center justify-center bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noiseFilter%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.65%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noiseFilter)%27 opacity=%270.02%27/%3E%3C/svg%3E')]">
      <main className="w-full max-w-md px-4">
        <div className="bg-surface border border-border rounded-xl p-8 shadow-2xl flex flex-col items-center">
          {/* Logo & Brand Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-primary-container flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
              ) : (
                <Logo className="w-full h-full object-cover rounded-full p-2" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">TokoKu Dashboard</h1>
            <p className="text-sm text-text-secondary">Panel Owner & Analitik Toko</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full bg-error/10 border border-error/20 text-error text-sm px-4 py-3 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5" htmlFor="email">Email</label>
              <input 
                id="email" 
                type="email" 
                placeholder="owner@toko.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-lg focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none text-text-primary px-3.5 py-2.5 text-sm transition-all" 
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-text-secondary" htmlFor="password">Password</label>
              </div>
              <div className="relative">
                <input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none text-text-primary px-3.5 py-2.5 text-sm pr-10 transition-all" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary-container text-on-primary-container hover:bg-primary transition-colors text-sm font-semibold rounded-lg h-11 mt-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? 'Memuat...' : 'Masuk Dashboard'}
            </button>
          </form>
        </div>

        {/* Contextual Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-text-secondary">
            Akses aman dilindungi oleh Supabase Auth.
          </p>
        </div>
      </main>
    </div>
  );
}
