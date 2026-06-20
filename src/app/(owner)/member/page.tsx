import { prisma } from '@/lib/db';
import MemberClient from './components/MemberClient';
import { startOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function MemberPage() {
  const members = await prisma.member.findMany({
    include: {
      Transaction: {
        select: {
          totalAmount: true,
          createdAt: true,
        }
      }
    },
    orderBy: {
      joinedAt: 'desc'
    }
  });

  const now = new Date();
  const startOfThisMonth = startOfMonth(now);

  const tiers = await prisma.memberTier.findMany({
    orderBy: [
      { minTransactions: 'desc' },
      { minTotalSpent: 'desc' }
    ]
  });

  const memberStats = members.map(m => {
    const totalSpent = m.Transaction.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalTransactions = m.Transaction.length;
    const transactionsThisMonth = m.Transaction.filter(t => t.createdAt >= startOfThisMonth).length;
    
    let tier = 'Tanpa Level';
    const activeTier = tiers.find(t => {
      const meetsTx = t.minTransactions > 0 && totalTransactions >= t.minTransactions;
      const meetsSpent = t.minTotalSpent > 0 && totalSpent >= t.minTotalSpent;
      if (t.minTransactions === 0 && t.minTotalSpent === 0) return true;
      return meetsTx || meetsSpent;
    }) || (tiers.length > 0 ? tiers[tiers.length - 1] : null);
    if (activeTier) {
      tier = activeTier.name;
    }

    return {
      id: m.id,
      name: m.name,
      phone: m.phone,
      joinedAt: m.joinedAt,
      totalSpent,
      totalTransactions,
      transactionsThisMonth,
      tier
    };
  });

  const totalMembers = members.length;
  const newMembersThisMonth = members.filter(m => m.joinedAt >= startOfThisMonth).length;
  const totalAllTimeSpent = memberStats.reduce((sum, m) => sum + m.totalSpent, 0);
  
  let mostActiveMember = null;
  if (memberStats.length > 0) {
    mostActiveMember = memberStats.reduce((prev, current) => 
      (prev.transactionsThisMonth > current.transactionsThisMonth) ? prev : current
    );
    if (mostActiveMember.transactionsThisMonth === 0) mostActiveMember = null;
  }

  const top10 = [...memberStats].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

  const tierCount: Record<string, number> = {};
  tiers.forEach(t => tierCount[t.name] = 0);
  tierCount['Tanpa Level'] = 0;
  memberStats.forEach(m => {
    if (tierCount[m.tier] !== undefined) tierCount[m.tier]++;
    else tierCount[m.tier] = 1;
  });

  return (
    <MemberClient 
      members={memberStats}
      totalMembers={totalMembers}
      newMembersThisMonth={newMembersThisMonth}
      totalAllTimeSpent={totalAllTimeSpent}
      mostActiveMember={mostActiveMember}
      top10={top10}
      tierCount={tierCount}
      tiers={tiers}
    />
  );
}
