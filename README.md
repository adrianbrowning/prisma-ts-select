# prisma-ts-select

![npm version](https://img.shields.io/npm/v/prisma-ts-select)
![build](https://github.com/adrianbrowning/prisma-ts-select/actions/workflows/CI.yml/badge.svg)
![license](https://img.shields.io/github/license/adrianbrowning/prisma-ts-select)

Type-safe raw SQL query builder for Prisma — write complex `SELECT` statements with full TypeScript inference, without leaving the Prisma ecosystem.

→ **Full documentation:** [`packages/prisma-ts-select/README.md`](./packages/prisma-ts-select/README.md)

## Quick links

- [Installation & Setup](./packages/prisma-ts-select/README.md#installation)
- [API Reference](./packages/prisma-ts-select/README.md#api)
- [Supported Databases](./packages/prisma-ts-select/README.md#supported-dbs)

## Monorepo structure

```
packages/
├── prisma-ts-select/     # Library source + docs
└── usage-<dialect>-<version>/  # Integration test packages (sqlite/mysql/pg × v6/v7)
```

## Contributing

```bash
pnpm i
pnpm --filter prisma-ts-select build
pnpm -r gen
./run-tests.sh [--version 6|7] [--db sqlite|mysql|pg]
```