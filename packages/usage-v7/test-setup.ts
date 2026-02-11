/**
 * Prisma v7 Test Setup - Driver Adapter Initialization
 *
 * v7 requires explicit driver adapters for all database providers.
 * This module provides adapter factory based on PRISMA_PROVIDER env var.
 */

import type { SqlDriverAdapter } from '@prisma/driver-adapter-utils'

const provider = process.env.PRISMA_PROVIDER || 'sqlite'

export async function getAdapter(): Promise<SqlDriverAdapter> {
  switch (provider) {
    case 'sqlite': {
      const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
      const factory = new PrismaBetterSqlite3({
        url: 'file:./prisma/data.db'
      })
      return await factory.connect()
    }

    case 'mysql': {
      const { PrismaMariaDb } = await import('@prisma/adapter-mariadb')
      const factory = new PrismaMariaDb({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'test',
        database: 'prisma_test',
      })
      return await factory.connect()
    }

    case 'postgresql': {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const factory = new PrismaPg({
        connectionString: 'postgresql://postgres:test@localhost:5432/prisma_test'
      })
      return await factory.connect()
    }

    default:
      throw new Error(`Unsupported PRISMA_PROVIDER: ${provider}`)
  }
}

/**
 * Create PrismaClient with driver adapter for current provider
 */
export async function createTestClient() {
  const { PrismaClient } = await import('../generated/client/index.js')
  const adapter = await getAdapter()
  return new PrismaClient({ adapter })
}
