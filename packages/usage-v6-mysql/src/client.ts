import { PrismaClient } from '../generated/prisma/index.js'
import tsSelectExtend from '@gcm/prisma-ts-select/extend'

export const prisma = new PrismaClient().$extends(tsSelectExtend)
