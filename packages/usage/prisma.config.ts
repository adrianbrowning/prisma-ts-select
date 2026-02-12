import { defineConfig } from 'prisma/config'

const provider = process.env.PRISMA_PROVIDER || 'sqlite'

export default defineConfig({
  schema: `prisma/schema.${provider}.prisma`,
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})