# CLAUDE.md

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

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**prisma-ts-select** is a TypeScript utility that enhances Prisma ORM with type-safe SQL query building. It's a Prisma generator that creates extension methods for building complex SQL queries with full TypeScript type safety, supporting joins, where clauses, groupBy, having, and other SQL operations.

The project is structured as a pnpm monorepo with two packages:
- `packages/prisma-ts-select`: The main library and Prisma generator
- `packages/usage`: Test package with test cases and example usage

## Common Commands

### Development Setup
```bash
# Install dependencies
pnpm i

# Build the prisma-ts-select package
pnpm --filter prisma-ts-select build
# OR from packages/prisma-ts-select directory
pnpm build

# Generate Prisma client and prisma-ts-select types
pnpm --filter usage gen
# OR from packages/usage directory
pnpm gen
```

### Testing
```bash
# Run all tests (from packages/usage)
pnpm test

# Run tests in watch mode
pnpm test:w

# Run specific test file
pnpm test:criteria

# TypeScript type checking
pnpm test:ts

# TypeScript type checking in watch mode
pnpm test:tsw
```

### Build & Generate Workflow
```bash
# From packages/usage, build prisma-ts-select and regenerate types
pnpm b&g
```

### Linting
```bash
# From packages/prisma-ts-select
pnpm lint:ts    # TypeScript check only
pnpm lint       # ESLint + TypeScript
pnpm lint:fix   # Auto-fix linting issues
```

### Prisma Operations
```bash
# From packages/usage
pnpm exec prisma generate              # Generate Prisma client
pnpm exec prisma db push               # Push schema to database
pnpm exec prisma migrate dev           # Create and apply migrations
pnpm p:r                               # Reset database (used before tests)
```

### Generator-Specific Command
```bash
# Run only the prisma-ts-select generator
pnpm exec prisma generate --generator prisma-ts-select
```

## Architecture

### Core Components

**Generator (`packages/prisma-ts-select/src/generator.ts`)**
- Prisma generator that parses the Prisma schema DMMF (Data Model Meta Format)
- Extracts models, fields, and relationships (foreign keys)
- Generates TypeScript type definitions representing the database schema
- Outputs a `DB` type object that maps tables to their fields and relations
- Handles both explicit foreign key relations and implicit many-to-many relations
- Supported databases: SQLite, MySQL, PostgreSQL

**Extension (`packages/prisma-ts-select/src/extend.ts`)**
- Provides the runtime query builder as a Prisma Client extension
- Exports `prismaTSSelect` that extends PrismaClient with `.$from()` method
- Implements fluent chainable API following SQL execution order:
  1. Sources: `.$from()` → `.join()` / `.joinUnsafe**()`
  2. Filtering: `.where()` / `.whereNotNull()` / `.whereIsNull()` / `.whereRaw()`
  3. Grouping: `.groupBy()`
  4. Selection: `.select()` / `.selectAll()` / `.selectDistinct()`
  5. Post-aggregation: `.having()`
  6. Ordering: `.orderBy()`
  7. Pagination: `.limit()` / `.offset()`
- Each method returns a new class instance with updated types and state
- Final `.run()` method executes the constructed SQL via `$queryRawUnsafe`

**Type System**
- Generated `DB` type maps table names to fields and relations
- Fields include nullability markers (`?` prefix for nullable columns)
- Relations track foreign key mappings between tables
- Type transformations convert Prisma types to TypeScript types:
  - `String` → `string`
  - `Int` / `Float` / `Decimal` → `number`
  - `BigInt` → `bigint`
  - `Boolean` → `boolean`
  - `DateTime` → `Date`
  - `Bytes` → `Buffer`
  - `Json` → `JSONValue`
- Chain methods progressively narrow types based on operations (e.g., `.whereNotNull()` removes `null` from union types)

### Key Design Patterns

**Method Chaining with Progressive Type Narrowing**
Each method returns a new class instance with updated TypeScript types that reflect the current query state. For example, after `.join("Post", "authorId", "User.id")`, TypeScript knows both `User` and `Post` tables are available for selection.

**MongoDB-Inspired Where Syntax**
The `.where()` method uses a MongoDB-like syntax with operators:
```typescript
{
  "Table.Column": value,
  "$AND": [...],
  "$OR": [...],
  "$NOT": [...],
  "$NOR": [...]
}
```

**Three Levels of Join Safety**
1. `.join()` - Type-safe joins using known foreign keys from schema
2. `.joinUnsafeTypeEnforced()` - Joins on same-type columns not explicitly linked
3. `.joinUnsafeIgnoreType()` - Joins on any columns regardless of type

**Query Execution Order Enforcement**
The TypeScript types enforce SQL's logical execution order - for example, `.having()` is only available after `.groupBy()`, and `.offset()` requires `.limit()` first.

## Development Workflow

### Making Changes to the Generator

1. Modify code in `packages/prisma-ts-select/src/`
2. Build: `pnpm --filter prisma-ts-select build`
3. Regenerate types: `cd packages/usage && pnpm gen`
4. Run type checks: `pnpm test:ts`
5. Run tests: `pnpm test`

### Adding New Features

When adding new SQL operations:
1. Update the generated type definitions in `generator.ts` if schema info is needed
2. Add the new method to the appropriate class in `extend.ts`
3. Ensure proper type narrowing and method chaining
4. Add test cases in `packages/usage/tests/`
5. Update documentation in README.md

### Testing Philosophy

- Tests use Node's built-in test runner (`node --test`)
- Each test file (`.spec.ts`) covers a specific feature area
- Tests reset the database before running (`pnpm p:r`)
- Type checking is a critical part of testing (`pnpm test:ts`)

## Database Support

Primary support: SQLite, MySQL
Secondary support: PostgreSQL (most features should work)

Note: HAVING clause has SQLite-specific limitations (requires aggregate functions in SELECT or usage of GROUP BY, can only use columns in SELECT or GROUP BY).

## Important Files

- `packages/prisma-ts-select/src/generator.ts` - Schema parser and type generator
- `packages/prisma-ts-select/src/extend.ts` - Query builder runtime
- `packages/usage/prisma/schema.prisma` - Test schema with various relation patterns
- `packages/usage/tests/*.spec.ts` - Test suites

## Branch Information

Current branch: `release2`
Main branch: Not configured (check with maintainer)
