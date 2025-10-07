# 🟢 Lower Priority Issues

## SQL Function Support

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

## Type Narrowing

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
