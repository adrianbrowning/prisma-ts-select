# syntax=docker/dockerfile:1
FROM node:24
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/prisma-ts-select/package.json ./packages/prisma-ts-select/
COPY packages/usage-v7-sqlite/package.json ./packages/usage-v7-sqlite/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --filter @gcm/usage-v7-sqlite... --frozen-lockfile

COPY packages/prisma-ts-select/ ./packages/prisma-ts-select/
COPY shared-tests/ ./shared-tests/
COPY packages/usage-v7-sqlite/ ./packages/usage-v7-sqlite/

WORKDIR /workspace/packages/prisma-ts-select
RUN pnpm build

WORKDIR /workspace/packages/usage-v7-sqlite
RUN pnpm gen

CMD ["pnpm", "test"]
