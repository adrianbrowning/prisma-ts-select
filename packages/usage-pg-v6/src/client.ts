import { PrismaClient } from '../generated/prisma/index.js'
import tsSelectExtend from '../generated/prisma-ts-select/extend.js'

export const prisma = new PrismaClient().$extends(tsSelectExtend)
