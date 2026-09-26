---
prisma-ts-select: minor
---

Added window functions to the `.select()` fn context on SQLite, MySQL and PostgreSQL. `over(fn, { partitionBy, orderBy, frame })` wraps `rowNumber()`, `rank()`, `denseRank()`, `lag()`, `lead()`, `firstValue()` and `lastValue()`. Partition and order terms accept in-scope columns or expressions, and a window function used without `over()` is a type error. Frames cover the portable `ROWS` forms and `RANGE` with unbounded or current-row bounds. Ranking functions return `bigint`, and navigation functions declare the type each driver returns, which differs from the plain column on MySQL and SQLite. The README includes a top-N-per-group example that uses a CTE.

Column arguments to the dialect fns in the `.select()` context now accept only real CTE columns (`cte.col`, typed from the CTE's row) instead of any `cte.<anything>` string.
