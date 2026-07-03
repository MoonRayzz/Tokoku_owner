/**
 * reset-data-supabase.mjs
 * Script untuk mengosongkan data uji coba di Supabase online (web-owner-tokoku)
 *
 * Cara pakai:
 *   node reset-data-supabase.mjs              → hapus transaksi saja (aman)
 *   node reset-data-supabase.mjs --full       → reset SEMUA (termasuk produk & master data)
 *
 * ⚠️  StoreProfile dan StoreStatus TIDAK akan dihapus (setting toko tetap aman)
 * ⚠️  Data di Supabase Auth (user login owner) TIDAK akan dihapus
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isFullReset = process.argv.includes("--full");

async function resetTransaksiSaja() {
  console.log("🔄 Mode: Hapus transaksi & data operasional saja...\n");

  // 1. SalaryPayout (Attendance punya FK ke sini)
  const sp = await prisma.salaryPayout.deleteMany();
  console.log(`  ✓ SalaryPayout dihapus: ${sp.count}`);

  // 2. Attendance
  const att = await prisma.attendance.deleteMany();
  console.log(`  ✓ Attendance dihapus: ${att.count}`);

  // 3. DebtPayment
  const dp = await prisma.debtPayment.deleteMany();
  console.log(`  ✓ DebtPayment dihapus: ${dp.count}`);

  // 4. Debt
  const debt = await prisma.debt.deleteMany();
  console.log(`  ✓ Debt dihapus: ${debt.count}`);

  // 5. VoidLog
  const vl = await prisma.voidLog.deleteMany();
  console.log(`  ✓ VoidLog dihapus: ${vl.count}`);

  // 6. TransactionDetail
  const td = await prisma.transactionDetail.deleteMany();
  console.log(`  ✓ TransactionDetail dihapus: ${td.count}`);

  // 7. Transaction
  const tx = await prisma.transaction.deleteMany();
  console.log(`  ✓ Transaction dihapus: ${tx.count}`);

  // 8. StockLog
  const sl = await prisma.stockLog.deleteMany();
  console.log(`  ✓ StockLog dihapus: ${sl.count}`);

  // 9. PoItem
  const poi = await prisma.poItem.deleteMany();
  console.log(`  ✓ PoItem dihapus: ${poi.count}`);

  // 10. PurchaseOrder
  const po = await prisma.purchaseOrder.deleteMany();
  console.log(`  ✓ PurchaseOrder dihapus: ${po.count}`);

  // 11. CashRegisterReport
  const crr = await prisma.cashRegisterReport.deleteMany();
  console.log(`  ✓ CashRegisterReport dihapus: ${crr.count}`);

  // 12. Expense
  const exp = await prisma.expense.deleteMany();
  console.log(`  ✓ Expense dihapus: ${exp.count}`);

  // 13. SyncQueue
  const sq = await prisma.syncQueue.deleteMany();
  console.log(`  ✓ SyncQueue dihapus: ${sq.count}`);

  console.log("\n✅ Data transaksi & operasional berhasil dihapus dari Supabase.");
  console.log("   Produk, Karyawan, Member, Shift tetap ada.");
}

async function resetSemua() {
  console.log("🔄 Mode: FULL RESET — semua data akan dihapus dari Supabase...\n");

  // Hapus transaksi & operasional dulu
  await resetTransaksiSaja();

  console.log("\n  📦 Lanjut hapus master data...");

  // 14. Member
  const mem = await prisma.member.deleteMany();
  console.log(`  ✓ Member dihapus: ${mem.count}`);

  // 15. MemberTier
  const mt = await prisma.memberTier.deleteMany();
  console.log(`  ✓ MemberTier dihapus: ${mt.count}`);

  // 16. Product
  const prod = await prisma.product.deleteMany();
  console.log(`  ✓ Product dihapus: ${prod.count}`);

  // 17. Supplier
  const sup = await prisma.supplier.deleteMany();
  console.log(`  ✓ Supplier dihapus: ${sup.count}`);

  // 18. Employee
  const emp = await prisma.employee.deleteMany();
  console.log(`  ✓ Employee dihapus: ${emp.count}`);

  // 19. Shift
  const shift = await prisma.shift.deleteMany();
  console.log(`  ✓ Shift dihapus: ${shift.count}`);

  console.log("\n✅ FULL RESET Supabase selesai!");
  console.log("   StoreProfile & StoreStatus TIDAK dihapus.");
  console.log("   User login owner (Supabase Auth) TIDAK terpengaruh.");
}

async function main() {
  console.log("=".repeat(55));
  console.log("  RESET DATA UJI COBA — Supabase Online (PostgreSQL)");
  console.log("=".repeat(55));
  console.log("");

  if (isFullReset) {
    console.log("⚠️  PERINGATAN: Mode FULL RESET dipilih!");
    console.log("   Semua produk, karyawan, member AKAN dihapus dari Supabase.");
    console.log("   Tekan Ctrl+C dalam 5 detik untuk batalkan...\n");
    await new Promise((r) => setTimeout(r, 5000));
  }

  try {
    if (isFullReset) {
      await resetSemua();
    } else {
      await resetTransaksiSaja();
    }
  } catch (error) {
    console.error("\n❌ Error saat reset:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
