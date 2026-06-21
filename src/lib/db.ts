import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  const pool = new Pool({ 
    connectionString,
    max: 20, // max connection pool limit
    connectionTimeoutMillis: 10000, // connection timeout
    idleTimeoutMillis: 30000 // idle timeout
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

export { prisma };

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
