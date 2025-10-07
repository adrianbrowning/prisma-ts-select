# Tasks & GitHub Issues

This file tracks open GitHub issues and breaks them down into actionable sub-tasks for implementation.

## Legend
- 🔴 High Priority
- 🟡 Medium Priority
- 🟢 Low Priority / Nice to Have
- ✅ Completed
- 🔄 In Progress
- ⏸️ Blocked

---

## 🔴 High Priority Issues

### [NEW] - Common Table Expressions (CTE) Support
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
// Accept the result of $from chain directly without calling .run()
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

// Option 3: Builder pattern with callback (alternative)
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

**Priority:** High - CTEs are a fundamental SQL feature for complex queries and would significantly enhance the library's capabilities.

---

### #31 - Allow select * for table ✅ COMPLETED
**Goal:** Allow the syntax `.select("Table.*")` to select all columns from a specific table.

**Sub-tasks:**
- [x] Update type definitions in `extend.ts` to accept `"Table.*"` pattern in `.select()`
- [x] Add regex or pattern matching to detect `Table.*` syntax
- [x] Expand `Table.*` to actual column list in SQL generation (e.g., `User.*` → `User.id, User.email, User.name`)
- [x] Ensure TypeScript inference correctly returns all fields from that table
- [x] Add test cases for single table and joined tables with `Table.*` syntax
- [x] Update README.md documentation with examples

**Completed in:** PR #36

**Technical Notes:**
- Should work similarly to `.selectAll()` but scoped to a single table
- Need to handle collision with existing wildcard `*` support
- Type system should return `Record<keyof Table["fields"], ...>`

---

### #32 - Support SELECT * OVER
**Goal:** Support window functions with OVER clause for advanced SQL queries.

**Sub-tasks:**
- [ ] Research window function support across SQLite, MySQL, PostgreSQL
- [ ] Design API syntax (e.g., `.selectOver("COUNT(*)", { partitionBy: [...], orderBy: [...] })`)
- [ ] Add window function types to type system
- [ ] Implement SQL generation for OVER clause with PARTITION BY and ORDER BY
- [ ] Handle frame specifications (ROWS/RANGE BETWEEN)
- [ ] Add comprehensive test coverage for window functions
- [ ] Document window function usage in README.md

**Technical Notes:**
- Window functions are complex - start with basic COUNT/SUM/AVG OVER
- SQLite has limited window function support (version 3.25+)
- Consider separate method like `.selectWindow()` vs extending `.select()`

---

### #30 - Where: Support for "<table>.<column>" Array of values
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

### #29 - whereRaw Support Prisma.sql
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
- This improves security by preventing SQL injection
- May require switching from `$queryRawUnsafe` to `$queryRaw` when Prisma.sql is used
- Reference: https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries#tagged-template-helpers

---

### #28 - Support table name alias
**Goal:** Allow aliasing table names for clearer queries (e.g., `FROM User AS u`).

**Sub-tasks:**
- [ ] Update `.$from()` to accept optional second parameter for alias
- [ ] Update `.join()` methods to accept optional alias parameter
- [ ] Store aliases in query state alongside table names
- [ ] Update SQL generation to include `AS alias` in FROM/JOIN clauses
- [ ] Update column references to use aliases where defined
- [ ] Ensure type system still resolves columns correctly with aliases
- [ ] Add test cases for aliased tables in various scenarios
- [ ] Update README.md with alias examples

**Technical Notes:**
- Syntax could be: `.$from("User", "u")` or `.$from({ table: "User", as: "u" })`
- Need to handle alias in all subsequent operations (where, select, etc.)
- Consider ambiguous cases where same table joined multiple times (this is the main use case)

---

### #27 - Support select column alias
**Goal:** Allow aliasing selected columns (e.g., `SELECT name AS username`).

**Sub-tasks:**
- [ ] Design API syntax (e.g., `.select("User.name", "username")` or `.select({ column: "User.name", as: "username" })`)
- [ ] Update `.select()` type signature to accept alias parameter
- [ ] Store column aliases in query state
- [ ] Update SQL generation to include `AS alias` in SELECT clause
- [ ] Update return type to use aliased names instead of original column names
- [ ] Handle alias in subsequent operations (orderBy, having, etc.)
- [ ] Add test cases for column aliases
- [ ] Update README.md with examples

**Technical Notes:**
- Return type should be `{ username: string }` instead of `{ name: string }`
- May need to track both original and aliased names for type system
- Consider interaction with `.selectAll()` - should aliases work there?

---

## 🟡 Medium Priority Issues

### #19 - Add Support for Many-To-Many Joins
**Goal:** Support joining through Many-to-Many relationships automatically.

**Sub-tasks:**
- [ ] Analyze existing M2M handling in `generator.ts` (lines 86-98 have partial implementation)
- [ ] Identify M2M relationships in schema (no explicit foreign keys, both sides have arrays)
- [ ] Generate join table information in DB type definition
- [ ] Create method like `.joinM2M()` that handles the two-step join automatically
- [ ] Generate SQL for M2M: `JOIN JoinTable ON ... JOIN TargetTable ON ...`
- [ ] Ensure type system properly types M2M joined columns
- [ ] Add test cases using existing M2M models in schema (M2M_Post, M2M_Category, etc.)
- [ ] Update README.md with M2M join examples

**Technical Notes:**
- Test schema has multiple M2M examples: M2M_Post/Category, M2M_NC_*, MMM_*
- Prisma creates implicit join tables for M2M (e.g., `_M2M_NC`)
- Need to detect M2M from `@relation` attribute or implicit join table

---

### #24 - Make Many-2-Many Joins more magical
**Goal:** Automatically detect and join through M2M relationships without explicit join syntax.

**Sub-tasks:**
- [ ] Depends on #19 being completed first
- [ ] Analyze relationship path to detect M2M relationships
- [ ] Auto-generate intermediate join when user tries to join M2M tables
- [ ] Update `.join()` to detect M2M and call `.joinM2M()` internally
- [ ] Ensure type system doesn't expose join table columns by default
- [ ] Add option to access join table columns if needed
- [ ] Add test cases for transparent M2M joins
- [ ] Document "magical" M2M behavior in README.md

**Technical Notes:**
- Should make M2M joins feel like regular joins from user perspective
- User shouldn't need to know about intermediate join table
- Consider: `.join("Category")` auto-detects it's M2M and handles join table

---

### #2 - Join Variations
**Goal:** Support different join types (LEFT, RIGHT, CROSS, INNER, FULL OUTER).

**Sub-tasks:**
- [ ] Add join type parameter to `.join()` methods (default: INNER)
- [ ] Create type union for valid join types: `type JoinType = "INNER" | "LEFT" | "RIGHT" | "CROSS" | "FULL"`
- [ ] Check database support for each join type (SQLite lacks RIGHT/FULL)
- [ ] Update SQL generation to include join type keyword
- [ ] Handle nullability in type system for LEFT/RIGHT/FULL joins
- [ ] Add type system magic to mark joined table fields as nullable for LEFT/RIGHT
- [ ] Create separate methods: `.leftJoin()`, `.rightJoin()`, `.crossJoin()`, `.fullJoin()`
- [ ] Add test cases for each join type on supported databases
- [ ] Update README.md with join type examples

**Technical Notes:**
- LEFT/RIGHT/FULL joins should make joined table fields nullable in types
- SQLite: supports INNER, LEFT, CROSS only
- MySQL/PostgreSQL: support all join types
- Consider: `.join("Post", "authorId", "User.id", "LEFT")` vs `.leftJoin("Post", "authorId", "User.id")`

---

### #26 - where clause
**Goal:** Unclear from issue title - needs investigation.

**Sub-tasks:**
- [ ] Review issue #26 details on GitHub
- [ ] Determine what where clause feature is missing
- [ ] Break down into implementation tasks once clarified

---

### #1 - selectAllOmit
**Goal:** Allow selecting all columns except specific ones (e.g., `.selectAllOmit(["User.password"])`).

**Sub-tasks:**
- [ ] Create `.selectAllOmit()` method that accepts array of `Table.Column` strings
- [ ] Get list of all available columns from tables in query
- [ ] Filter out omitted columns from the list
- [ ] Generate SELECT clause with remaining columns
- [ ] Update type system to return type excluding omitted fields
- [ ] Use `Omit<>` utility type to remove excluded fields
- [ ] Add test cases for omitting various field combinations
- [ ] Update README.md with selectAllOmit examples

**Technical Notes:**
- Type should be: `Omit<AllFields, "User.password">`
- Common use case: excluding sensitive fields like passwords, tokens
- Should work with both single table and joined tables
- Consider validation: error if omitted column doesn't exist

---

## 🟢 Lower Priority Issues

### #4 - Select functions - Aggregate
**Goal:** Support SQL aggregate functions: COUNT, SUM, AVG, MAX, MIN.

**Sub-tasks:**
- [ ] Design API for function calls in select (e.g., `.select({ fn: "COUNT", args: ["*"], as: "count" })`)
- [ ] Add aggregate function types to type system
- [ ] Implement COUNT(*) and COUNT(column)
- [ ] Implement SUM(column) with numeric type checking
- [ ] Implement AVG(column) with numeric type checking
- [ ] Implement MAX(column) with comparable type checking
- [ ] Implement MIN(column) with comparable type checking
- [ ] Update return type to reflect aggregate return types (COUNT → number, etc.)
- [ ] Add test cases for each aggregate function
- [ ] Document aggregate functions in README.md

**Technical Notes:**
- Aggregates typically require GROUP BY (except COUNT(*) on whole table)
- Return type should be nullable for MAX/MIN on empty sets
- Consider chaining: `.select("User.name").selectCount("*", "total")`

---

### #5 - Select functions - String
**Goal:** Support SQL string functions: CONCAT, SUBSTRING, REPLACE, LENGTH, UPPER, LOWER.

**Sub-tasks:**
- [ ] Extend function API from #4 to support string functions
- [ ] Implement CONCAT with variable arguments
- [ ] Implement SUBSTRING with position and length parameters
- [ ] Implement REPLACE with find/replace parameters
- [ ] Implement LENGTH returning number type
- [ ] Implement UPPER/LOWER maintaining string type
- [ ] Ensure type safety: string functions only on string columns
- [ ] Add test cases for string functions
- [ ] Document string functions in README.md

**Technical Notes:**
- Function signatures vary across databases (e.g., SUBSTRING vs SUBSTR)
- May need database-specific SQL generation
- Consider: `.select({ fn: "UPPER", args: ["User.name"], as: "upperName" })`

---

### #6 - Select functions - Date and Time
**Goal:** Support SQL date/time functions: NOW, CURDATE, DATE_ADD, DATE_SUB, YEAR, MONTH, DAY.

**Sub-tasks:**
- [ ] Implement NOW() returning DateTime type
- [ ] Implement CURDATE() returning Date type
- [ ] Implement DATE_ADD with interval support
- [ ] Implement DATE_SUB with interval support
- [ ] Implement YEAR/MONTH/DAY extractors returning number
- [ ] Handle database-specific date function syntax differences
- [ ] Add test cases for date functions
- [ ] Document date functions in README.md

**Technical Notes:**
- Date functions vary significantly across databases
- SQLite uses different functions than MySQL/PostgreSQL
- Interval syntax differs (MySQL: INTERVAL 1 DAY, SQLite: datetime('+1 day'))

---

### #7 - Select functions - Mathematical
**Goal:** Support SQL math functions: ABS, CEIL, FLOOR, ROUND, POWER, SQRT.

**Sub-tasks:**
- [ ] Implement ABS maintaining numeric type
- [ ] Implement CEIL/FLOOR returning integer
- [ ] Implement ROUND with optional precision parameter
- [ ] Implement POWER with base and exponent
- [ ] Implement SQRT returning float
- [ ] Ensure type safety: math functions only on numeric columns
- [ ] Add test cases for math functions
- [ ] Document math functions in README.md

---

### #8 - Select functions - Control Flow
**Goal:** Support SQL control flow: IF, CASE, IFNULL, COALESCE.

**Sub-tasks:**
- [ ] Design API for conditional expressions
- [ ] Implement IF with condition, true value, false value
- [ ] Implement CASE WHEN with multiple conditions
- [ ] Implement IFNULL for null coalescing
- [ ] Implement COALESCE with multiple fallback values
- [ ] Determine return type from possible result types
- [ ] Add test cases for control flow functions
- [ ] Document control flow in README.md

**Technical Notes:**
- CASE is complex - may need dedicated builder
- IFNULL can help with type system (removes null from union)
- SQLite uses IFNULL, MySQL has both IFNULL and COALESCE

---

### #9 - Select functions - JSON
**Goal:** Support SQL JSON functions: JSON_EXTRACT, JSON_ARRAY, JSON_OBJECT.

**Sub-tasks:**
- [ ] Implement JSON_EXTRACT with path parameter
- [ ] Implement JSON_ARRAY for creating arrays
- [ ] Implement JSON_OBJECT for creating objects
- [ ] Handle JSON type in type system (already has JSONValue type)
- [ ] Consider database-specific JSON support (PostgreSQL: ->, MySQL: JSON_EXTRACT)
- [ ] Add test cases for JSON functions
- [ ] Document JSON functions in README.md

**Technical Notes:**
- JSON support varies widely across databases
- SQLite 3.38+ has JSON functions
- PostgreSQL has rich JSON support with operators
- May need database-specific implementations

---

### #3 - When checking a value is not null, remove null from type union
**Goal:** `.whereNotNull("User.username")` should remove null from username type in results.

**Sub-tasks:**
- [ ] Already has `.whereNotNull()` method - verify current behavior
- [ ] Check if type narrowing is already implemented
- [ ] If not, update return type to exclude null from specified column
- [ ] Add test case verifying type is `string` not `string | null`
- [ ] Update README.md example to show type narrowing

**Status:** May already be implemented based on README examples. Needs verification.

---

### #11 - When checking a value is null, remove non-null from type union
**Goal:** `.whereIsNull("User.name")` should make the field only null in results.

**Sub-tasks:**
- [ ] Already has `.whereIsNull()` method - verify current behavior
- [ ] Update return type to show field as only `null` type
- [ ] Add test case verifying type narrowing
- [ ] Update README.md with example

**Status:** May already be implemented. Needs verification.

---

## 🧪 Testing & Infrastructure

### #15 - Add tests for having must be after groupBy
**Goal:** Ensure `.having()` can only be called after `.groupBy()` and test this enforcement.

**Sub-tasks:**
- [ ] Review current type system enforcement (should already prevent this)
- [ ] Add TypeScript test cases that should fail to compile
- [ ] Add runtime test verifying error when `.having()` called without `.groupBy()`
- [ ] Document the ordering requirement in README.md

---

### #13 - Tests, type check object, union of types
**Goal:** Unclear - needs investigation and clarification.

**Sub-tasks:**
- [ ] Review issue #13 on GitHub for details
- [ ] Determine what type checking is needed
- [ ] Break down into specific test cases

---

### #18 - CI: Husky, ESLint, StyleLint, knip.dev
**Goal:** Improve CI/CD tooling and code quality checks.

**Sub-tasks:**
- [ ] Already has Husky - verify it's working correctly
- [ ] Already has ESLint - review and update rules if needed
- [ ] Add StyleLint for CSS/SCSS (if applicable, might not be needed)
- [ ] Already has knip configured - ensure it runs in CI
- [ ] Add lint check to GitHub Actions workflow
- [ ] Add knip check to GitHub Actions workflow
- [ ] Configure pre-commit hooks for auto-formatting
- [ ] Document linting setup in README.md

**Status:** Partially completed - Husky, ESLint, knip already configured.

---

## 📦 Publishing & Infrastructure

### #20 - Set up publish to npm/jsr
**Goal:** Automate publishing to npm and JSR (JavaScript Registry).

**Sub-tasks:**
- [ ] Review existing semantic-release configuration in package.json
- [ ] Configure npm publishing automation (may already be configured but commented out)
- [ ] Research JSR publishing requirements
- [ ] Add JSR publishing to release workflow
- [ ] Configure release branches (currently only 'main')
- [ ] Test release process on a test version
- [ ] Document release process in CONTRIBUTING.md

**Status:** Semantic release is configured but publish job is commented out in CI.yml.

---

### #21 - Change Sets
**Goal:** Unclear - possibly relates to tracking changes or migrations.

**Sub-tasks:**
- [ ] Review issue #21 on GitHub for context
- [ ] Determine what change set functionality is needed
- [ ] Break down into implementation tasks

---

### #22 - Review repo for ideas
**Goal:** Review another repository for feature ideas or implementation patterns.

**Sub-tasks:**
- [ ] Identify the repository to review
- [ ] List relevant features or patterns to adopt
- [ ] Create follow-up tasks for valuable ideas

---

## 📝 Notes

### Development Priority Recommendation:
1. **Quick Wins:** #31 (Table.*), #1 (selectAllOmit), #3/#11 (type narrowing verification)
2. **High Value:** #2 (Join variations), #27/#28 (Aliases), #29 (Prisma.sql)
3. **Major Features:** #19/#24 (Many-to-Many), #4-9 (SQL Functions)
4. **Infrastructure:** #18 (CI improvements), #20 (Publishing)

### Testing Strategy:
- Always add test cases in `packages/usage/tests/`
- Run `pnpm test:ts` to verify TypeScript types compile correctly
- Run `pnpm test` to verify runtime behavior
- Use existing schema in `packages/usage/prisma/schema.prisma` or extend it

### Documentation:
- Update `README.md` for user-facing features
- Update `CLAUDE.md` for significant architectural changes
- Keep `TASKS.md` updated as issues progress