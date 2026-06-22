import { prisma } from '@/lib/db';
import AbsensiClient from './components/AbsensiClient';
import { PAGE_SIZE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const pageParam = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const limit = PAGE_SIZE.ABSENSI;

  const [attendances, totalCount, salaryPayouts, unpaidAttendances, storeProfile] = await Promise.all([
    prisma.attendance.findMany({
      include: { employee: true, shift: true },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendance.count(),
    prisma.salaryPayout.findMany({
      include: { employee: true, attendances: true },
      orderBy: { paidAt: 'desc' }
    }),
    prisma.attendance.findMany({
      where: { isPaid: false },
      include: { employee: true, shift: true }
    }),
    prisma.storeProfile.findFirst()
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const employees = await prisma.employee.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const shifts = await prisma.shift.findMany({
    orderBy: {
      startTime: 'asc',
    },
  });

  return (
    <AbsensiClient 
      attendances={attendances}
      employees={employees}
      shifts={shifts}
      salaryPayouts={salaryPayouts}
      unpaidAttendances={unpaidAttendances}
      totalPages={totalPages}
      totalCount={totalCount}
      currentPage={page}
      limit={limit}
      storeName={storeProfile?.name || 'TokoKu'}
    />
  );
}
