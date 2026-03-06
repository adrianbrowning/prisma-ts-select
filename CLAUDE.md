## Commands

```bash
# Setup
pnpm i
pnpm --filter prisma-ts-select build    # Build generator
pnpm -r gen                             # Generate Prisma client + types

# Testing
./run-tests.sh [--version 6|7] [--db sqlite|mysql|pg] [--skip-build] [--reset-db] [--test <glob>]
pnpm --filter <usage-[dialect]-v[version]> test          # All tests (lint:ts + node --test)
pnpm --filter <usage-[dialect]-v[version]> test:readme   # README example tests
pnpm --filter <usage-[dialect]-v[version]> test:core     # Core tests
pnpm --filter <usage-[dialect]-v[version]> test:dialect  # Dialect tests
pnpm --filter <usage-[dialect]-v[version]> lint:ts       # TypeScript check

# Prisma
pnpm --filter <usage-[dialect]-v[version]> gen   # Generate client
pnpm --filter <usage-[dialect]-v[version]> p:r   # Force push schema + seed
```

`--reset-db` runs `p:r` before tests; omit if data already seeded.

## Directory Structure

```
packages/
├── prisma-ts-select/src/
│   ├── generator.ts   # DMMF → TS type defs
│   └── extend.ts      # Runtime query builder
└── usage-<dialect>-<version>/
    ├── prisma/schema.prisma
    └── tests/
```

<!-- claude-knowledge-autoload -->
## Knowledge Files

Auto-maintained by Claude Code hooks. Load on demand — not upfront.

| File | Load when... |
|------|-------------|
| `~/.claude/skills/preferences/SKILL.md` | Starting any task — shapes how you work |
| `~/.claude/skills/learnings/SKILL.md` | Debugging, hitting errors, or running CLI commands |
| `.claude/patterns/SKILL.md` | Reading, writing, reviewing, or running code/tests in this repo |

Read only the file relevant to what you are about to do. Do not load all three upfront.
<!-- end-claude-knowledge-autoload -->

## Plan mode
Remember to always use TDD for implementation. 
RED->GREEN->REFACTOR.
Use 3 agents, 1 for each of the 3 phases.
