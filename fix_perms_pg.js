const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });

async function main() {
  try {
    console.log("Granting schema usage...");
    await pool.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`);
    
    console.log("Granting all privileges on all tables...");
    await pool.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;`);
    
    console.log("Granting all privileges on all sequences...");
    await pool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`);
    
    console.log("Altering default privileges...");
    await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;`);
    await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;`);

    console.log("Done! Permissions fixed.");
  } catch (err) {
    console.error("Error fixing permissions:", err);
  } finally {
    await pool.end();
  }
}

main();
