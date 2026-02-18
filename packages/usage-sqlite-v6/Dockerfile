# syntax=docker/dockerfile:1
FROM node:24-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for dependency resolution
COPY packages/prisma-ts-select/package.json ./packages/prisma-ts-select/
COPY packages/usage-v6-sqlite/package.json ./packages/usage-v6-sqlite/

# Install dependencies with cache mount for pnpm store
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --filter @gcm/usage-v6-sqlite... --frozen-lockfile

# Copy source code
COPY packages/prisma-ts-select/ ./packages/prisma-ts-select/
COPY shared-tests/ ./shared-tests/
COPY packages/usage-v6-sqlite/ ./packages/usage-v6-sqlite/

# Build generator
WORKDIR /workspace/packages/prisma-ts-select
RUN pnpm build

# Generate Prisma client and run tests
WORKDIR /workspace/packages/usage-v6-sqlite
RUN pnpm gen

CMD ["pnpm", "test"]
