import { PrismaClient } from '@prisma/client';

// Create a single Prisma Client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
