# syntax=docker/dockerfile:1
FROM node:24-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/prisma-ts-select/package.json ./packages/prisma-ts-select/
COPY packages/usage-v6-mysql/package.json ./packages/usage-v6-mysql/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --filter @gcm/usage-v6-mysql... --frozen-lockfile

COPY packages/prisma-ts-select/ ./packages/prisma-ts-select/
COPY shared-tests/ ./shared-tests/
COPY packages/usage-v6-mysql/ ./packages/usage-v6-mysql/

WORKDIR /workspace/packages/prisma-ts-select
RUN pnpm build

WORKDIR /workspace/packages/usage-v6-mysql
RUN pnpm gen

CMD ["pnpm", "test"]
