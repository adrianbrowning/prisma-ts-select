The role of this file is to describe common mistakes and confusion points that agents might encounter as they work in this project. If you ever encounter something in the project that surprises you, please alert the developer working with you and indicate that this is the case in the Agent.MD file to help prevent future agents from having the same issue.


## Commands

```bash
# Setup
pnpm i                                  # Install deps
pnpm --filter prisma-ts-select build    # Build generator
pnpm --filter usage gen                 # Generate Prisma client + types
pnpm b&g                                # Build + regenerate (from packages/usage)

# Testing (from packages/usage)
pnpm -r|--filter <usage-[dialect]-v[version]> test                               # All tests (type-check + node --test)
pnpm -r|--filter <usage-[dialect]-v[version]> test:readme                        # README example tests
pnpm -r|--filter <usage-[dialect]-v[version]> test:core                          # Core tests only
pnpm -r|--filter <usage-[dialect]-v[version]> test:dialect                          # Core tests only

# Linting (from packages/prisma-ts-select)
pnpm -r|--filter <usage-[dialect]-v[version]> lint:ts                            # TypeScript check
#pnpm -r|--filter <usage-[dialect]-v[version]> lint                               # ESLint + TypeScript
#pnpm -r|--filter <usage-[dialect]-v[version]> lint:fix                           # Auto-fix

# Prisma (from packages/usage)
pnpm -r|--filter <usage-[dialect]-v[version]> gen               # Generate client
pnpm -r|--filter <usage-[dialect]-v[version]> p:r                # Force Push schema, and seed
```

## Directory Structure

```
packages/
├── prisma-ts-select/
│   └── src/
│       ├── generator.ts     # Schema parser, DMMF → TS type defs
│       └── extend.ts        # Runtime query builder (Prisma extension)
└── usage-<dialect>-<version>/
    ├── prisma/schema.prisma # Test schema
    └── tests/
        ├── *.spec.ts        # Feature test suites
        ├── core/            # Core tests
        └── readme/          # README example tests
```

## Generator Change Workflow

1. Modify `packages/prisma-ts-select/src/`
2. `pnpm --filter prisma-ts-select build`
3. `pnpm -r gen`
4. `pnpm -r test:ts` then `pnpm -r test`

## Architecture

**Fluent API (SQL execution order)**: `$from()` → `join()` → `where()` → `groupBy()` → `select()` → `having()` → `orderBy()` → `limit()` → `offset()` → `run()`

**Method Chaining + Progressive Type Narrowing**: each method returns new instance w/ updated TS types reflecting query state.

**Three Join Safety Levels**:
1. `.join()` — type-safe via schema foreign keys
2. `.joinUnsafeTypeEnforced()` — same-type columns, no FK link
3. `.joinUnsafeIgnoreType()` — any columns

**Where Syntax (MongoDB-inspired)**: `{ "Table.Column": value, "$AND": [...], "$OR": [...], "$NOT": [...], "$NOR": [...] }`

**Type System**: Generated `DB` type maps tables → fields + relations. `?` prefix = nullable. Prisma→TS mapping: String→string, Int/Float/Decimal→number, BigInt→bigint, Boolean→boolean, DateTime→Date, Bytes→Buffer, Json→JSONValue.

## Testing

- Node's built-in test runner (`node --test`)
- Each `.spec.ts` covers specific feature area
- DB reset before tests (`pnpm -r p:r`)
- Type checking is critical (`pnpm -r lint:ts`)
- HAVING clause has SQLite-specific limitations (requires aggregate fns in SELECT or GROUP BY)

## Documentation Testing

**CRITICAL:** All README.md code examples MUST be backed by executable tests.

1. Test files w/ `#region` markers in `packages/usage/tests/readme/`
2. README annotations: `file=path/to/test.ts region=regionName`
3. All examples must pass `pnpm test:ts` + `pnpm test:readme`
4. Region isolation: only query code in regions, not imports/assertions
5. See `README_TESTING.md` for full workflow
6. **Never add README examples without corresponding tests.**

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
