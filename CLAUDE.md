# Project Guidelines

## Project Overview

- **Name**: prisma-ts-select
- **Purpose**: Prisma generator + extension for type-safe SQL query building (joins, where, groupBy, having, etc.)
- **Stack**: TypeScript, Prisma ORM, pnpm monorepo
- **Packages**: `packages/prisma-ts-select` (library/generator), `packages/usage` (tests/examples)
- **DB Support**: SQLite, MySQL (primary), PostgreSQL (secondary)

## Commands

```bash
# Setup
pnpm i                                  # Install deps
pnpm --filter prisma-ts-select build    # Build generator
pnpm --filter usage gen                 # Generate Prisma client + types
pnpm b&g                                # Build + regenerate (from packages/usage)

# Testing (from packages/usage)
pnpm test                               # All tests (type-check + node --test)
pnpm test:ts                            # TypeScript type checking only
pnpm test:tsw                           # Type checking watch mode
pnpm test:w                             # Tests watch mode
pnpm test:readme                        # README example tests
pnpm test:core                          # Core tests only

# Linting (from packages/prisma-ts-select)
pnpm lint:ts                            # TypeScript check
pnpm lint                               # ESLint + TypeScript
pnpm lint:fix                           # Auto-fix

# Prisma (from packages/usage)
pnpm exec prisma generate               # Generate client
pnpm exec prisma db push                # Push schema
pnpm exec prisma migrate dev            # Create/apply migrations
pnpm p:r                                # Reset database
```

## Directory Structure

```
packages/
├── prisma-ts-select/
│   └── src/
│       ├── generator.ts     # Schema parser, DMMF → TS type defs
│       └── extend.ts        # Runtime query builder (Prisma extension)
└── usage/
    ├── prisma/schema.prisma # Test schema
    └── tests/
        ├── *.spec.ts        # Feature test suites
        ├── core/            # Core tests
        └── readme/          # README example tests
```

## Generator Change Workflow

1. Modify `packages/prisma-ts-select/src/`
2. `pnpm --filter prisma-ts-select build`
3. `cd packages/usage && pnpm gen`
4. `pnpm test:ts` then `pnpm test`

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
- DB reset before tests (`pnpm p:r`)
- Type checking is critical (`pnpm test:ts`)
- HAVING clause has SQLite-specific limitations (requires aggregate fns in SELECT or GROUP BY)

## Documentation Testing

**CRITICAL:** All README.md code examples MUST be backed by executable tests.

1. Test files w/ `#region` markers in `packages/usage/tests/readme/`
2. README annotations: `file=path/to/test.ts region=regionName`
3. All examples must pass `pnpm test:ts` + `pnpm test:readme`
4. Region isolation: only query code in regions, not imports/assertions
5. See `README_TESTING.md` for full workflow
6. **Never add README examples without corresponding tests.**

## Session Rules

ALWAYS use todo lists. Keep a file based one in-sync with the memory version encase the session dies. Make sure there is enough information to start everything off again.
ALWAYS use sub-agents to help keep your context window cleaner/smaller.

Be casual.
Be terse.
Give the answer first.
Treat me like an expert.
Skip restating the question unless needed.
Anticipate my needs—suggest better or alternate solutions.
Be accurate, thorough, and grounded.
Prefer strong arguments over authoritative sources.
Use cutting-edge or contrarian ideas where useful, not just best practices.
Be extremely concise. Sacrifice grammar for the sake of concision.

Use speculation or prediction freely, just flag it clearly ([Speculation], [Inference], etc).
Only discuss safety if it’s truly critical and not obvious.
If a content policy prevents a full reply, give the closest allowed alternative and explain the restriction.

If I ask for code edits, avoid repeating large blocks—just show the diff with context.
Multiple short code blocks are fine. Respect my Prettier settings.

If anything is unverified or outside your training data, label the entire response with [Unverified].
For LLM behavior claims, label with [Inference] or [Unverified], based on observed patterns.

Never paraphrase, reword, or reinterpret my input unless I ask.
Don’t guess or fill in missing info—ask for clarification. Never present speculation as fact.

Use sources when available, but cite them at the end.
Don't mention your training cutoff. Don’t say you’re an AI. If response quality is reduced due to these rules, say so.

Always ask if unsure about anything.


If you break these, say:
“Correction: I previously made an unverified claim. That was incorrect and should have been labeled.”

