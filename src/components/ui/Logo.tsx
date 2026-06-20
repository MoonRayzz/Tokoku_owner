'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/app/lib/supabase/client';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "w-full h-full object-cover rounded-full" }: LogoProps) {
  const [logoUrl, setLogoUrl] = useState("https://lh3.googleusercontent.com/aida/AP1WRLtxFRq9KSygQHszKUJplYIRys5-LUKaChS0Us3DVY_vIs17olRZ7umS8A48NTiwLm8ILZtWb8mLTj-zNzo7jBFuq9PTw3GwEQZtCvx91XInOrztL9tv4Mi671IY6apBUGQ9deuGyxqFGwEhE5-Yw5AkOQv8vV1iTLVzAXWNAqeVbheSqEiywTu4l545qjr61kl0At-ZsXreyuQcnq6EK31UXNuiCD62eci-pLjrWDo6yCZI5xKlEJtzoA");
  const supabase = createClient();

  useEffect(() => {
    async function fetchLogo() {
      const { data } = await supabase.from('StoreProfile').select('logoUrl').eq('id', 'local-store').single();
      if (data && data.logoUrl) {
        setLogoUrl(data.logoUrl);
      }
    }
    fetchLogo();
  }, [supabase]);

  return (
    <img 
      alt="TokoKu Logo" 
      src={logoUrl}
      className={className}
    />
  );
}
