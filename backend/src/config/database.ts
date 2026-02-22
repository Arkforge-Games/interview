import { PrismaClient } from '@prisma/client';
import { env } from './environment';

// Create a singleton Prisma client (only if DATABASE_URL is configured)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient | null = null;

if (env.DATABASE_URL) {
  prismaInstance =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: env.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    });

  if (!env.isProduction) {
    globalForPrisma.prisma = prismaInstance;
  }
} else {
  console.warn('Warning: DATABASE_URL not set. Database features disabled.');
}

export const prisma = prismaInstance as PrismaClient;

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  if (!prismaInstance) {
    console.warn('✗ Database not configured (no DATABASE_URL)');
    return false;
  }
  try {
    await prismaInstance.$queryRaw`SELECT 1`;
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    console.log('Database disconnected');
  }
}
