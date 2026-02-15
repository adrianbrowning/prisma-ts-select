import { PrismaClient } from '../generated/prisma/index.js'
import tsSelectExtend from '../generated/prisma-ts-select/extend.js'
import { loadEnvFile} from "node:process"

loadEnvFile(".env")

export const prisma = new PrismaClient().$extends(tsSelectExtend)
