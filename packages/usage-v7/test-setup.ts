/**
 * Prisma v7 Test Setup - Driver Adapter Initialization
 *
 * v7 requires explicit driver adapters for all database providers.
 * This module provides adapter factory based on PRISMA_PROVIDER env var.
 */

import type { DriverAdapter } from '@prisma/client'

const provider = process.env.PRISMA_PROVIDER || 'sqlite'

export async function getAdapter(): Promise<DriverAdapter> {
  switch (provider) {
    case 'sqlite': {
      const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
      const Database = (await import('better-sqlite3')).default
      const db = new Database('prisma/data.db')
      return new PrismaBetterSqlite3(db)
    }

    case 'mysql': {
      const { PrismaMariaDB } = await import('@prisma/adapter-mariadb')
      const mariadb = await import('mariadb')
      const pool = mariadb.createPool({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'test',
        database: 'prisma_test',
      })
      return new PrismaMariaDB(pool)
    }

    case 'postgresql': {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const pg = await import('pg')
      const pool = new pg.Pool({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'test',
        database: 'prisma_test',
      })
      return new PrismaPg(pool)
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
