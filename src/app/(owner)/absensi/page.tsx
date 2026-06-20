import { prisma } from '@/lib/db';
import AbsensiClient from './components/AbsensiClient';

export const dynamic = 'force-dynamic';

export default async function AbsensiPage() {
  const attendances = await prisma.attendance.findMany({
    include: {
      employee: true,
      shift: true,
    },
    orderBy: {
      date: 'desc',
    },
    take: 50, // Fetch the latest 50 records for now
  });

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
    />
  );
}
