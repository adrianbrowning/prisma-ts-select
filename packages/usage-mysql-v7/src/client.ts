import { PrismaClient } from '../generated/prisma/client.ts'
import tsSelectExtend from '../generated/prisma-ts-select/extend-v7.js'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { loadEnvFile } from "node:process";

loadEnvFile(".env");

const DB_URL=new URL(process.env.DATABASE_URL || "");

const adapter = new PrismaMariaDb({
  host: DB_URL.hostname,
  port: Number(DB_URL.port),
  user: DB_URL.username,
  password: DB_URL.password,
  database: DB_URL.pathname.slice(1),
  connectionLimit: 10,
  connectTimeout: 1e3,
  acquireTimeout: 1e3,
})

export const prisma = new PrismaClient({ adapter }).$extends(tsSelectExtend)
