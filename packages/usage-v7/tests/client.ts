/**
 * Shared test client for v7 tests
 * Exports PrismaClient extended with tsSelectExtend + driver adapter
 */

import { PrismaClient } from '../generated/client.js'
import tsSelectExtend from 'prisma-ts-select/extend'
import { getAdapter } from '../test-setup.js'

// Initialize adapter based on PRISMA_PROVIDER env var
const adapter = await getAdapter()

// Create extended client with adapter
export const prisma = new PrismaClient({ adapter }).$extends(tsSelectExtend)

// Re-export PrismaClient type for type imports
export { PrismaClient } from '../generated/client.js'
