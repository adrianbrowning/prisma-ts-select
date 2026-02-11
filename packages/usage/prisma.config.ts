import { defineConfig } from 'prisma';

export default defineConfig({
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
