import { defineConfig } from 'prisma/config'

const provider = process.env.PRISMA_PROVIDER || 'sqlite'

const urls = {
  sqlite: 'file:./prisma/data.db',
  mysql: 'mysql://root:test@localhost:3306/prisma_test',
  postgresql: 'postgresql://postgres:test@localhost:5432/prisma_test',
}

export default defineConfig({
  schema: `prisma/schema.${provider}.prisma`,
  datasource: {
    url: urls[provider as keyof typeof urls],
  },
})
