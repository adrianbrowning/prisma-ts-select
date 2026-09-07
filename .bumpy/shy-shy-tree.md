---
prisma-ts-select: minor
---

Added `.orderBy()` and `.filter()` to aggregate expressions (`stringAgg`/`groupConcat`, `arrayAgg`, `jsonAgg`, `jsonObjectAgg`), compiled as native `ORDER BY`/`FILTER` on PostgreSQL and SQLite and as `CASE WHEN` on MySQL `GROUP_CONCAT`. MySQL `jsonArrayAgg`/`jsonObjectAgg` expose no aggregate clauses, since MySQL supports neither for them.
