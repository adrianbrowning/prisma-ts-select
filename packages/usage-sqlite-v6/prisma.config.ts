import { defineConfig } from 'prisma/config'
import {loadEnvFile} from "node:process";
loadEnvFile(".env");

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'node prisma/seed.ts',
    },
    datasource: {
        url: process.env.DATABASE_URL,
    },
})
