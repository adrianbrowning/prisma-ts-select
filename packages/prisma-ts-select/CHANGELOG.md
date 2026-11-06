# prisma-ts-select


## 0.5.0
<sub>2026-11-06</sub>

- [#208](https://github.com/adrianbrowning/prisma-ts-select/pull/208)  *(minor)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)! - Adding support for Recursive CTEs
- [#209](https://github.com/adrianbrowning/prisma-ts-select/pull/209)  *(minor)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)! - Adding typed `$union` / `$unionAll` query composition
- [#210](https://github.com/adrianbrowning/prisma-ts-select/pull/210)  *(minor)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)!
  Added `.orderBy()` and `.filter()` to aggregate expressions (`groupConcat`/`stringAgg`, `arrayAgg`, `jsonAgg`, `jsonObjectAgg`), compiled as native `ORDER BY`/`FILTER` on PostgreSQL and SQLite and as `CASE WHEN` on MySQL `GROUP_CONCAT`. Successive `.filter()` calls AND together and successive `.orderBy()` calls append terms; both return a new expression.

  Three invalid combinations now fail in the library instead of at the database: criteria that compile to an empty condition (e.g. `.filter({})`, which would otherwise have silently aggregated every row), a MySQL `DISTINCT` aggregate combined with `.filter()` (previously emitted `CASE WHEN … THEN DISTINCT col`, rejected with ERROR 1064), and a PostgreSQL `DISTINCT` aggregate ordered by any column other than its own argument (rejected by PostgreSQL with 42P10). MySQL `jsonArrayAgg`/`jsonObjectAgg` expose no aggregate clauses, since MySQL supports neither for them.
- [#223](https://github.com/adrianbrowning/prisma-ts-select/pull/223)  *(minor)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)!
  Added `exists` and `notExists` to `.where()` criteria, rendered as `EXISTS (…)` / `NOT EXISTS (…)` on every dialect. The operand is a query builder, or a callback whose `from()` opens a correlated subquery that can reference the outer query's columns through `$col` / `$colRaw`. Both keys compose with the other criteria and nest inside `$AND`, `$OR`, `$NOT` and `$NOR`. Type errors now cover subquery references to tables the outer query doesn't have, subquery tables that reuse an outer table's name or alias, and operands that are not query builders. At runtime, an operand that is not a query builder throws a `TypeError`. `exists` and `notExists` are now reserved keys, so a single-table query can't filter a column with either name through the criteria object.
- [#224](https://github.com/adrianbrowning/prisma-ts-select/pull/224)  *(minor)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)!
  Added window functions to the `.select()` fn context on SQLite, MySQL and PostgreSQL. `over(fn, { partitionBy, orderBy, frame })` wraps `rowNumber()`, `rank()`, `denseRank()`, `lag()`, `lead()`, `firstValue()` and `lastValue()`. Partition and order terms accept in-scope columns or expressions, and a window function used without `over()` is a type error. Frames cover the portable `ROWS` forms and `RANGE` with unbounded or current-row bounds. Ranking functions return `bigint`, and navigation functions declare the type each driver returns, which differs from the plain column on MySQL and SQLite. The README includes a top-N-per-group example that uses a CTE. The `.where()` and `.having()` fn contexts leave the window functions out, because SQL rejects them there.

  Column arguments to the dialect fns in the `.select()` context now accept only real CTE columns (`cte.col`, typed from the CTE's row) instead of any `cte.<anything>` string.
- [#182](https://github.com/adrianbrowning/prisma-ts-select/pull/182)  *(patch)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)! - Reworked to remove a @ts-expect-error
- [#216](https://github.com/adrianbrowning/prisma-ts-select/pull/216)  *(patch)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)!
  Fixed the SQLite `jsonExtract` result type: it is now `string | number | bigint | null`, matching what SQLite returns (objects and arrays as JSON text, integers and booleans as bigint).
- [#217](https://github.com/adrianbrowning/prisma-ts-select/pull/217)  *(patch)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)!
  Aggregate `.orderBy()` now autocompletes its column the way `.select()` does: `Table.` prefixes and unambiguous bare columns first, then that table's columns once `Table.` is typed. Before, it listed every qualified column in scope at once. The set of accepted columns is unchanged.

## 0.4.0

### Minor Changes

- c3927f6: feat: support CTE references in crossJoin
- 1eec210: feat: add correlated subquery support via from in select callback
- 7c7b967: Add progressive autocomplete for select() column paths — IDE now narrows suggestions to matched table's fields after typing "Table." prefix
- 39d398b: Restrict having() criteria overload to only accept columns specified in groupBy()
- e84b795: Add DATE() function to dialect context

## 0.3.0

### Minor Changes

- 900882b: Add $col and $colRaw to where type clauses
- 900882b: Add coalesce/ifNull and scalar subquery support in select

### Patch Changes

- 900882b: Eliminate TS2590 union blowup
