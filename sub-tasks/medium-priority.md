# 🟡 Medium Priority Issues

## #19 - Add Support for Many-To-Many Joins
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

## #24 - Make Many-2-Many Joins more magical
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

## #2 - Join Variations (LEFT, RIGHT, CROSS, INNER, FULL OUTER)
**Goal:** Support different join types.

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

## #26 - Where Clause Enhancement
**Goal:** Unclear from issue title - needs investigation.

**Sub-tasks:**
- [ ] Review issue #26 details on GitHub
- [ ] Determine what where clause feature is missing
- [ ] Break down into implementation tasks once clarified

---

## #1 - selectAllOmit
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

## #31 - Allow select * for table ✅ COMPLETED
**Status:** Completed in PR #36

**Goal:** Allow the syntax `.select("Table.*")` to select all columns from a specific table.

**Completed Features:**
- `.select("Table.*")` expands to all columns from that table
- Works with single tables and joins
- Automatic aliasing with table prefix when joins present
- 9 comprehensive tests, all passing
