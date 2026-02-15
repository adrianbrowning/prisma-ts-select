import { loadEnvFile } from "node:process"
import { PrismaClient } from '../generated/prisma/client.ts'
import tsSelectExtend from '../generated/prisma-ts-select/extend.js'
import { PrismaPg } from '@prisma/adapter-pg'

loadEnvFile(".env");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  max: 10,
})

export const prisma = new PrismaClient({ adapter }).$extends(tsSelectExtend)
