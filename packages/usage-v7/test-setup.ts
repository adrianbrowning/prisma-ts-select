/**
 * Prisma v7 Test Setup - Driver Adapter Initialization
 *
 * v7 requires explicit driver adapters for all database providers.
 * This module provides adapter factory based on PRISMA_PROVIDER env var.
 */

import type { SqlDriverAdapterFactory } from '@prisma/driver-adapter-utils'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const provider = process.env.PRISMA_PROVIDER || 'sqlite'

export async function getAdapter(): Promise<SqlDriverAdapterFactory> {
  switch (provider) {
    case 'sqlite': {
      const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
      return new PrismaBetterSqlite3({
        url: join(__dirname, 'prisma', 'data.db')
      })
    }

    case 'mysql': {
      const { PrismaMariaDb } = await import('@prisma/adapter-mariadb')
      return new PrismaMariaDb({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'test',
        database: 'prisma_test',
      })
    }

    case 'postgresql': {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      return new PrismaPg({
        connectionString: 'postgresql://postgres:test@localhost:5432/prisma_test'
      })
    }

    default:
      throw new Error(`Unsupported PRISMA_PROVIDER: ${provider}`)
  }
}

/**
 * Create PrismaClient with driver adapter factory for current provider
 */
export async function createTestClient() {
  const { PrismaClient } = await import('@generated/client.ts')
  const adapter = await getAdapter()
  return new PrismaClient({ adapter })
}
