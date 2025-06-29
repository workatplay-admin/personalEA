// File: services/goal-strategy/src/utils/db.ts
// Create this new file for Prisma singleton with connection pooling

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  var prisma: PrismaClient | undefined;
}

// Configure Prisma with connection pooling
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '?pool_timeout=20&connection_limit=10'
      }
    }
  });
};

// Create singleton instance
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Monitor connection pool
prisma.$on('query' as never, async (e: any) => {
  if (e.duration > 1000) {
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration,
      params: e.params
    });
  }
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };
export default prisma;