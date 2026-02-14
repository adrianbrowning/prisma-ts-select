import { PrismaClient } from '../generated/prisma/index.js'
import tsSelectExtend from '@gcm/prisma-ts-select/extend'
import { loadEnvFile} from "node:process"

loadEnvFile(".env")

export const prisma = new PrismaClient({
    // datasources: {
    //     db:{
    //         "url": process.env.DATABASE_URL,
    //     }
    // }
}).$extends(tsSelectExtend)
