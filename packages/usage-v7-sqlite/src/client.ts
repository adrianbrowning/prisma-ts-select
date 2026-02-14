import { PrismaClient } from '../generated/client.ts'
import tsSelectExtend from '@gcm/prisma-ts-select/extend'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { loadEnvFile} from "node:process"

loadEnvFile(".env")

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL,
})

export const prisma = new PrismaClient({ adapter }).$extends(tsSelectExtend)
