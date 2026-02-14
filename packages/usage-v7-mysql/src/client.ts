import { PrismaClient } from '../generated/prisma/client.ts'
import tsSelectExtend from '@gcm/prisma-ts-select/extend'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { loadEnvFile } from "node:process";

loadEnvFile(".env");

const DB_URL=new URL(process.env.URL || "");

const adapter = new PrismaMariaDb({
  host: DB_URL.hostname,
  port: DB_URL.port,
  user: DB_URL.username,
  password: DB_URL.password,
  database: DB_URL.pathname.slice(1),
  connectionLimit: 5,
  connectTimeout: 1000,
  acquireTimeout: 1000,
})

export const prisma = new PrismaClient({ adapter }).$extends(tsSelectExtend)
