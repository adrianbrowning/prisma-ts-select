# 🔴 High Priority Issues

## [NEW] - Common Table Expressions (CTE) Support
**Goal:** Support WITH clauses for Common Table Expressions (CTEs) including recursive CTEs.

**Sub-tasks:**
- [ ] Design API for CTE definition accepting query builder instances directly
- [ ] Update `.with()` method signature to accept query builder (result of `.$from()` chain without `.run()`)
- [ ] Extract SQL and parameters from query builder instance for CTE subquery
- [ ] Support callback pattern as alternative: `.with("name", (qb) => qb.$from(...))`
- [ ] Support multiple CTEs in single query (chaining `.with()` calls)
- [ ] Implement non-recursive CTEs first
- [ ] Add CTE to query state and SQL generation
- [ ] Make CTE results available as "tables" in main query
- [ ] Infer CTE column types from the query builder's return type
- [ ] Update type system to include CTE columns as available for selection/joining
- [ ] Implement recursive CTE support with `WITH RECURSIVE`
- [ ] Add base case and recursive case for recursive CTEs
- [ ] Handle UNION/UNION ALL in recursive CTEs
- [ ] Check database support (SQLite 3.8.3+, MySQL 8.0+, PostgreSQL all versions)
- [ ] Add test cases for:
  - [ ] Simple CTE with single table
  - [ ] Multiple CTEs in one query
  - [ ] CTE with joins
  - [ ] Recursive CTE (e.g., organizational hierarchy, graph traversal)
  - [ ] CTE referenced multiple times in main query
- [ ] Document CTE usage in README.md with examples

**Technical Notes:**
- CTE syntax: `WITH cte_name AS (SELECT ...) SELECT * FROM cte_name`
- Recursive CTE syntax: `WITH RECURSIVE cte AS (base_case UNION ALL recursive_case) SELECT ...`
- CTEs can reference previously defined CTEs
- Common use cases:
  - Breaking complex queries into readable parts
  - Recursive hierarchies (org charts, category trees, bill of materials)
  - Deduplication and ranking
  - Avoiding repeated subqueries
- Type system should treat CTE like a virtual table with inferred column types
- **Query builder reuse:** The query builder passed to `.with()` should NOT have `.run()` called
  - Need to detect if a query builder instance vs callback is passed
  - Extract internal SQL generation from query builder without executing
  - Type inference should flow from the subquery's selected columns to CTE usage
- Consider materialized CTEs (PostgreSQL: `WITH ... AS MATERIALIZED`)
- Implementation challenge: Query builders currently generate SQL in `.run()` - may need to expose internal SQL builder method

**API Design Options:**
```typescript
// Option 1: Direct query builder (RECOMMENDED)
const activeUsersQuery = prisma.$from("User")
  .where({ "User.active": true })
  .select("id")
  .select("name");

prisma
  .with("active_users", activeUsersQuery)
  .$from("active_users")
  .join("Post", "authorId", "active_users.id")
  .selectAll()
  .run();

// Option 2: Inline query builder
prisma
  .with("active_users",
    prisma.$from("User").where({ "User.active": true }).select("id").select("name")
  )
  .$from("active_users")
  .selectAll()
  .run();

// Option 3: Builder pattern with callback
prisma
  .with("active_users", (qb) =>
    qb.$from("User").where({ "User.active": true }).select("id").select("name")
  )
  .$from("active_users")
  .join("Post", "authorId", "active_users.id")
  .selectAll()
  .run();

// Option 4: Recursive CTE with query builders
const baseCase = prisma.$from("Employee")
  .where({ "Employee.managerId": null })
  .select("id")
  .select("name")
  .select("managerId");

const recursiveCase = prisma.$from("Employee")
  .join("org_tree", "managerId", "org_tree.id")
  .select("Employee.id")
  .select("Employee.name")
  .select("Employee.managerId");

prisma
  .withRecursive("org_tree", {
    base: baseCase,
    recursive: recursiveCase
  })
  .$from("org_tree")
  .selectAll()
  .run();
```

**Priority:** High - CTEs are a fundamental SQL feature for complex queries.

---

## #32 - Support SELECT * OVER (Window Functions)
**Status:** Research notes available in `ISSUE-32-NOTES.md`

**Goal:** Support window functions with OVER clause for advanced SQL queries.

**Sub-tasks:**
- [x] Research window function support across SQLite, MySQL, PostgreSQL
- [x] Design API syntax (`.selectOver()` method - Option 3)
- [ ] Implement window function types in type system
- [ ] Implement SQL generation for OVER clause with PARTITION BY and ORDER BY
- [ ] Handle frame specifications (ROWS/RANGE BETWEEN)
- [ ] Add comprehensive test coverage for window functions
- [ ] Document window function usage in README.md

**Technical Notes:**
- Detailed research in `ISSUE-32-NOTES.md`
- Start with basic COUNT/SUM/AVG OVER
- SQLite 3.25+ required
- Use separate `.selectOver()` method

---

## #30 - Where: Support for Array of Values (IN Operator)
**Goal:** Support array-based filtering in where clauses (e.g., `WHERE User.id IN [1, 2, 3]`).

**Sub-tasks:**
- [ ] Extend `WhereClause` type to accept arrays as values
- [ ] Update where clause parser to detect array values
- [ ] Generate SQL with `IN (...)` operator for arrays
- [ ] Generate SQL with `NOT IN (...)` for negative array matching
- [ ] Add type checking to ensure array element types match column type
- [ ] Add test cases for IN/NOT IN with numbers, strings, dates
- [ ] Update README.md where clause examples

**Technical Notes:**
- Should work with existing `op` syntax: `{ "User.id": { op: "IN", value: [1,2,3] } }`
- Already partially documented in README as supported - verify if implemented
- Need to handle empty arrays (should throw error or return no results)

---

## #29 - whereRaw Support Prisma.sql
**Goal:** Support Prisma's tagged template literals for SQL injection-safe raw queries.

**Sub-tasks:**
- [ ] Import `Prisma.sql` from `@prisma/client`
- [ ] Update `.whereRaw()` method signature to accept both `string` and `Prisma.Sql`
- [ ] Detect if parameter is tagged template (has `.sql` property)
- [ ] Pass Prisma.sql directly to `$queryRaw` instead of `$queryRawUnsafe`
- [ ] Refactor `.run()` method to handle both query types
- [ ] Add test cases with parameterized queries using Prisma.sql
- [ ] Document SQL injection safety in README.md

**Technical Notes:**
- Improves security by preventing SQL injection
- May require switching from `$queryRawUnsafe` to `$queryRaw` when Prisma.sql is used
- Reference: https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries#tagged-template-helpers

---

## #28 - Support Table Name Alias
**Status:** 🔄 In Progress

**Goal:** Allow aliasing table names for clearer queries (e.g., `FROM User AS u`).

**Sub-tasks:**
- [x] Write comprehensive TDD tests
- [ ] Update `.$from()` to accept optional second parameter for alias
- [ ] Update `.join()` methods to accept optional alias parameter
- [ ] Store aliases in query state alongside table names
- [ ] Update SQL generation to include `AS alias` in FROM/JOIN clauses
- [ ] Update column references to use aliases where defined
- [ ] Ensure type system still resolves columns correctly with aliases
- [ ] Update README.md with alias examples

**Technical Notes:**
- Syntax: `.$from("User", "u")` and `.join("Post", "authorId", "User.id", "p")`
- Main use case: self-joins where same table is joined multiple times
- Keep type system using actual table names, only use aliases in SQL generation

---

## #27 - Support Select Column Alias ✅ COMPLETED
**Status:** Completed in PR #37

**Goal:** Allow aliasing selected columns (e.g., `SELECT name AS username`).

**Completed Features:**
- Two-parameter syntax: `.select("User.name", "username")`
- Type-safe aliasing with proper type inference
- Aliases can be used in ORDER BY clauses
- Backward compatible (alias parameter is optional)
- All tests passing (20 column alias tests + 64 total)