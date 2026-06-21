import React from 'react';
import { prisma } from '@/lib/db';
import { createClient } from '@/app/lib/supabase/server';
import { redirect } from 'next/navigation';
import AuditVoidClient from './components/AuditVoidClient';
import { PAGE_SIZE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AuditVoidPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const pageParam = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const limit = PAGE_SIZE.DEFAULT;

  const [voidLogs, totalCount] = await Promise.all([
    prisma.voidLog.findMany({
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        transaction: {
          include: {
            details: {
              include: { product: true }
            }
          }
        }
      }
    }),
    prisma.voidLog.count()
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return <AuditVoidClient 
    voidLogs={voidLogs} 
    totalPages={totalPages}
    totalCount={totalCount}
    currentPage={page}
    limit={limit}
  />;
}
