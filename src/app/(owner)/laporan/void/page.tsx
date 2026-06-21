import React from 'react';
import { prisma } from '@/lib/db';
import { createClient } from '@/app/lib/supabase/server';
import { redirect } from 'next/navigation';
import AuditVoidClient from './components/AuditVoidClient';

export const dynamic = 'force-dynamic';

export default async function AuditVoidPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const voidLogs = await prisma.voidLog.findMany({
    orderBy: { date: 'desc' },
    include: {
      transaction: {
        include: {
          details: {
            include: { product: true }
          }
        }
      }
    }
  });

  return <AuditVoidClient voidLogs={voidLogs} />;
}
