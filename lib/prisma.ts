import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient for the application.
 * In development, the client is cached on `globalThis` to survive HMR
 * without leaking connections. In production a single instance is created.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
