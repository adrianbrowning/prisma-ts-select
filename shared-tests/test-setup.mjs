// Global test setup - registers cleanup hooks
// Usage: node --import ./test-setup.mjs
import { after } from 'node:test';

// Dynamically import client based on CLIENT_PACKAGE env var
const clientModule = await import('#client');
const prisma = clientModule.prisma;

// Disconnect Prisma after all tests to prevent hanging
after(async () => {
  await prisma.$disconnect();
});
