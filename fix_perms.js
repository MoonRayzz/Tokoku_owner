const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Granting schema usage...");
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`);
    
    console.log("Granting all privileges on all tables...");
    await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;`);
    
    console.log("Granting all privileges on all sequences...");
    await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`);
    
    console.log("Altering default privileges...");
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;`);
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;`);

    console.log("Done! Permissions fixed.");
  } catch (err) {
    console.error("Error fixing permissions:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
