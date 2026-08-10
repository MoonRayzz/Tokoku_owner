const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

const tables = [
  "TransactionDetail",
  "Transaction",
  "StockLog",
  "PoItem",
  "PurchaseOrder",
  "CashRegisterReport",
  "Expense",
  "SyncQueue",
  "VoidLog",
  "StoreStatus",
  "StoreProfile",
  "SalaryPayout",
  "Attendance",
  "DebtPayment",
  "Debt",
  "Member",
  "MemberTier",
  "Supplier",
  "Employee",
  "Shift",
  "Product"
];

async function main() {
  try {
    console.log("Enabling RLS on all tables...");
    for (const table of tables) {
      await pool.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`RLS enabled for ${table}`);
    }
    
    console.log("Creating SELECT policies for StoreProfile and StoreStatus...");
    // Drop policies if they exist to prevent errors on multiple runs
    await pool.query(`DROP POLICY IF EXISTS "Allow public read StoreProfile" ON "StoreProfile";`);
    await pool.query(`DROP POLICY IF EXISTS "Allow public read StoreStatus" ON "StoreStatus";`);

    // Create policies allowing anyone (anon & authenticated) to read
    await pool.query(`CREATE POLICY "Allow public read StoreProfile" ON "StoreProfile" FOR SELECT USING (true);`);
    await pool.query(`CREATE POLICY "Allow public read StoreStatus" ON "StoreStatus" FOR SELECT USING (true);`);

    console.log("Done! RLS configured successfully.");
  } catch (err) {
    console.error("Error configuring RLS:", err);
  } finally {
    await pool.end();
  }
}

main();
