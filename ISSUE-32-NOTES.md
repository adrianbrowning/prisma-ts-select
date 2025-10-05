# Issue #32 - Window Functions Implementation Notes

## Status: ON HOLD - Switching to Issue #31

## Research Completed

### Database Support
- **SQLite**: Supported since version 3.25.0 (2018)
- **MySQL**: Supported since version 8.0 (2018)
- **PostgreSQL**: Supported in all modern versions

### Common Window Functions
**Ranking Functions:**
- `ROW_NUMBER()` - Assigns a unique sequential integer to rows within a partition
- `RANK()` - Assigns a rank with gaps for ties
- `DENSE_RANK()` - Assigns a rank without gaps for ties
- `NTILE(n)` - Divides rows into n buckets

**Aggregate Functions (with OVER):**
- `COUNT()`, `SUM()`, `AVG()`, `MAX()`, `MIN()`

**Value Functions:**
- `LAG(column, offset)` - Access previous row value
- `LEAD(column, offset)` - Access next row value
- `FIRST_VALUE(column)` - First value in window
- `LAST_VALUE(column)` - Last value in window
- `NTH_VALUE(column, n)` - Nth value in window

### Window Function Syntax
```sql
SELECT
  column1,
  column2,
  WINDOW_FUNCTION() OVER (
    PARTITION BY column3
    ORDER BY column4 [ASC|DESC]
    [ROWS|RANGE BETWEEN ...]
  ) AS alias
FROM table
```

## API Design Decision

**Chosen Approach: Option 3 - Dedicated `.selectOver()` method**

### Example Usage
```typescript
prisma.$from("Post")
  .select("Post.title")
  .selectOver({
    fn: "ROW_NUMBER()",
    partitionBy: ["Post.authorId"],
    orderBy: ["Post.createdAt DESC"],
    as: "row_num"
  })
  .run()

// Multiple window functions
prisma.$from("Post")
  .join("User", "authorId", "User.id")
  .select("User.name")
  .select("Post.title")
  .selectOver({
    fn: "ROW_NUMBER()",
    partitionBy: ["User.id"],
    orderBy: ["Post.createdAt DESC"],
    as: "post_rank"
  })
  .selectOver({
    fn: "COUNT(*)",
    partitionBy: ["User.id"],
    as: "total_posts"
  })
  .run()

// Aggregate with window
prisma.$from("Post")
  .selectOver({
    fn: "SUM(Post.views)",
    partitionBy: ["Post.authorId"],
    orderBy: ["Post.createdAt"],
    as: "running_total"
  })
  .run()
```

## Implementation Plan

### 1. Type System Changes
- [ ] Add `WindowFunctionSpec` type to define window function configuration
- [ ] Update `Values` type to include `windows?: Array<WindowFunctionSpec>`
- [ ] Create type for valid window functions
- [ ] Handle return type inference for window columns (aliased columns)

### 2. Extend.ts Changes
- [ ] Add `.selectOver()` method to appropriate class in chain
- [ ] Store window function specs in query state
- [ ] Update SQL generation in `getSQL()` to include window functions in SELECT clause
- [ ] Generate proper OVER clause syntax with PARTITION BY and ORDER BY

### 3. SQL Generation
Window function in SELECT clause should generate:
```sql
SELECT
  other_columns,
  WINDOW_FUNCTION() OVER (
    PARTITION BY col1, col2
    ORDER BY col3 DESC, col4 ASC
  ) AS alias
FROM ...
```

### 4. Type Definitions Needed
```typescript
type WindowFunctionSpec = {
  fn: string; // e.g., "ROW_NUMBER()", "COUNT(*)", "SUM(Post.views)"
  partitionBy?: Array<string>; // Column references
  orderBy?: Array<string>; // Column references with optional ASC/DESC
  as: string; // Required alias for the result
  // Future: frame specification
  // rows?: { start: string, end: string }; // e.g., "ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW"
}
```

### 5. Advanced Features (Future)
- [ ] Frame specifications (ROWS/RANGE BETWEEN)
- [ ] Named windows (WINDOW clause)
- [ ] Window function validation per database type
- [ ] Type-safe column references in partitionBy/orderBy

## Testing Strategy
Test cases needed in `packages/usage/tests/`:
- [ ] Simple ROW_NUMBER() with PARTITION BY
- [ ] COUNT(*) OVER (PARTITION BY)
- [ ] Multiple window functions in same query
- [ ] Window function with JOIN
- [ ] Aggregate window functions (SUM, AVG, etc.)
- [ ] LAG/LEAD functions
- [ ] Window function with only ORDER BY (no PARTITION BY)
- [ ] Window function with only PARTITION BY (no ORDER BY)

## Documentation Updates
- [ ] README.md - Add window functions section with examples
- [ ] Show common use cases (running totals, ranking, row numbers)
- [ ] Note database version requirements

## Related Code Files
- `packages/prisma-ts-select/src/extend.ts` - Main implementation
- `packages/prisma-ts-select/src/generator.ts` - Type generation (may not need changes)
- `packages/usage/prisma/schema.prisma` - Test schema
- `packages/usage/tests/*.spec.ts` - Test files

## Questions to Resolve Later
1. Should window functions work with `.selectAll()` or only explicit `.select()`?
2. How to handle frame specifications in a type-safe way?
3. Should we validate window function names against a whitelist?
4. How to handle database-specific window functions?

## References
- SQLite: https://sqlite.org/windowfunctions.html
- MySQL: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- PostgreSQL: https://www.postgresql.org/docs/current/tutorial-window.html