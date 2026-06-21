import { prisma } from '@/lib/db';
import MemberClient from './components/MemberClient';
import { startOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function MemberPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const pageParam = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const limit = 20;
  
  const searchParam = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';
  const sortParam = typeof resolvedParams.sort === 'string' ? resolvedParams.sort : 'totalTransactions';
  const orderParam = typeof resolvedParams.order === 'string' ? resolvedParams.order : 'desc';

  const now = new Date();
  const startOfThisMonth = startOfMonth(now);

  const tiers = await prisma.memberTier.findMany({
    orderBy: [
      { minTransactions: 'desc' },
      { minTotalSpent: 'desc' }
    ]
  });

  // Calculate segment based on lastSold
  // Aktif: <=30 days, Tidur: 31-90 days, Hilang: >90 days, Belum Pernah: null
  
  // Using Raw SQL to get all metrics, handle searching, sorting, and pagination
  // This avoids loading all transactions into memory.
  const searchPattern = searchParam ? `%${searchParam}%` : '%';
  const offset = (page - 1) * limit;

  // We need to build the ORDER BY dynamically, but Prisma $queryRaw doesn't support dynamic columns well.
  // We can use Prisma's unsafe raw query if necessary, or just fetch all aggregated data and paginate in JS if under ~10,000 members.
  // Actually, fetching 10k rows of simple aggregated data in Node.js takes ~50ms, which is completely fine for a dashboard. Let's do raw SQL without limit first, then sort/paginate in JS. This allows complex sorting and segmenting without complex dynamic SQL.
  
  const memberAggregates: any[] = await prisma.$queryRaw`
    SELECT 
      m.id,
      m.name,
      m.phone,
      m."joinedAt",
      COALESCE(COUNT(t.id), 0) as "totalTransactions",
      COALESCE(SUM(t."totalAmount"), 0) as "totalSpent",
      MAX(t."createdAt") as "lastSold"
    FROM "Member" m
    LEFT JOIN "Transaction" t ON t."memberId" = m.id AND t."isVoid" = false
    WHERE m.name ILIKE ${searchPattern} OR m.phone ILIKE ${searchPattern}
    GROUP BY m.id
  `;

  // Calculate tiers and segments in JS
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();

  let formattedMembers = memberAggregates.map(m => {
    const totalSpent = Number(m.totalSpent);
    const totalTransactions = Number(m.totalTransactions);
    const avgSpent = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
    
    let tier = 'Tanpa Level';
    const activeTier = tiers.find(t => {
      const meetsTx = t.minTransactions > 0 && totalTransactions >= t.minTransactions;
      const meetsSpent = t.minTotalSpent > 0 && totalSpent >= t.minTotalSpent;
      if (t.minTransactions === 0 && t.minTotalSpent === 0) return true;
      return meetsTx || meetsSpent;
    }) || (tiers.length > 0 ? tiers[tiers.length - 1] : null);
    if (activeTier) tier = activeTier.name;

    let segment = 'Belum Pernah Belanja';
    if (m.lastSold) {
      const diff = nowMs - new Date(m.lastSold).getTime();
      if (diff <= THIRTY_DAYS_MS) segment = 'Aktif';
      else if (diff <= NINETY_DAYS_MS) segment = 'Tidur';
      else segment = 'Hilang';
    }

    return {
      id: m.id,
      name: m.name,
      phone: m.phone,
      joinedAt: m.joinedAt,
      totalSpent,
      totalTransactions,
      avgSpent,
      lastSold: m.lastSold ? new Date(m.lastSold).toISOString() : null,
      tier,
      segment
    };
  });

  // Sorting
  formattedMembers.sort((a, b) => {
    let valA = a[sortParam as keyof typeof a];
    let valB = b[sortParam as keyof typeof b];
    
    if (sortParam === 'lastSold') {
      valA = valA ? new Date(valA as string).getTime() : 0;
      valB = valB ? new Date(valB as string).getTime() : 0;
    }
    
    if (valA < valB) return orderParam === 'asc' ? -1 : 1;
    if (valA > valB) return orderParam === 'asc' ? 1 : -1;
    return 0;
  });

  const totalMembers = formattedMembers.length;
  const totalPages = Math.ceil(totalMembers / limit);
  
  // KPI data (calculated across all members ignoring pagination)
  const totalAllTimeSpent = formattedMembers.reduce((sum, m) => sum + m.totalSpent, 0);
  const newMembersThisMonth = formattedMembers.filter(m => m.joinedAt >= startOfThisMonth).length;
  
  // We can't calculate transactionsThisMonth efficiently from the raw query without adding another column, 
  // but we can skip mostActiveMember or just use totalTransactions for simplicity if it's fine.
  // Actually, we'll keep Top 10 Loyal based on totalSpent.
  const top10 = [...formattedMembers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
  
  const tierCount: Record<string, number> = {};
  tiers.forEach(t => tierCount[t.name] = 0);
  tierCount['Tanpa Level'] = 0;
  formattedMembers.forEach(m => {
    if (tierCount[m.tier] !== undefined) tierCount[m.tier]++;
    else tierCount[m.tier] = 1;
  });

  // Paginate
  const paginatedMembers = formattedMembers.slice(offset, offset + limit);

  return (
    <MemberClient 
      members={paginatedMembers}
      totalMembers={totalMembers}
      newMembersThisMonth={newMembersThisMonth}
      totalAllTimeSpent={totalAllTimeSpent}
      top10={top10}
      tierCount={tierCount}
      tiers={tiers}
      currentPage={page}
      totalPages={totalPages}
      currentSearch={searchParam}
      currentSort={sortParam}
      currentOrder={orderParam}
    />
  );
}
