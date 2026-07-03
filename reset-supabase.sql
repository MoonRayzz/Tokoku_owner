-- ================================================================
-- RESET TOTAL — Supabase SQL Editor
-- Hapus semua data uji coba (produk, transaksi, member, dll)
-- StoreProfile & StoreStatus TIDAK dihapus (setting toko aman)
-- User login Supabase Auth TIDAK terpengaruh
--
-- Cara pakai:
--   Buka Supabase Dashboard → SQL Editor → New Query
--   Paste script ini → klik "Run"
-- ================================================================

-- Nonaktifkan trigger sementara supaya lebih cepat
SET session_replication_role = replica;

-- Hapus semua tabel data (CASCADE otomatis urus foreign key)
TRUNCATE TABLE
  "SalaryPayout",
  "Attendance",
  "DebtPayment",
  "Debt",
  "VoidLog",
  "TransactionDetail",
  "Transaction",
  "StockLog",
  "PoItem",
  "PurchaseOrder",
  "CashRegisterReport",
  "Expense",
  "SyncQueue",
  "Member",
  "MemberTier",
  "Product",
  "Supplier",
  "Employee",
  "Shift"
CASCADE;

-- Aktifkan kembali trigger
SET session_replication_role = DEFAULT;

-- Verifikasi hasil (opsional, jalankan setelah TRUNCATE di atas)
SELECT
  'Transaction'        AS tabel, COUNT(*) AS sisa FROM "Transaction"
UNION ALL SELECT 'Product',        COUNT(*) FROM "Product"
UNION ALL SELECT 'Member',         COUNT(*) FROM "Member"
UNION ALL SELECT 'Employee',       COUNT(*) FROM "Employee"
UNION ALL SELECT 'Attendance',     COUNT(*) FROM "Attendance"
UNION ALL SELECT 'Expense',        COUNT(*) FROM "Expense"
UNION ALL SELECT 'StockLog',       COUNT(*) FROM "StockLog"
UNION ALL SELECT 'Debt',           COUNT(*) FROM "Debt"
UNION ALL SELECT 'SyncQueue',      COUNT(*) FROM "SyncQueue"
UNION ALL SELECT 'StoreProfile',   COUNT(*) FROM "StoreProfile"
ORDER BY tabel;
