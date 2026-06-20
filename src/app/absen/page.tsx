import { prisma } from '@/lib/db';
import AbsenClient from './components/AbsenClient';

export const dynamic = 'force-dynamic';

export default async function AbsenPage() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, wageBase: true, wageSolo: true }
  });

  const shifts = await prisma.shift.findMany({
    where: { isActive: true }
  });

  const storeProfile = await prisma.storeProfile.findUnique({
    where: { id: 'local-store' }
  });

  return (
    <AbsenClient employees={employees} shifts={shifts} storeProfile={storeProfile} />
  );
}
