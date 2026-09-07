---
prisma-ts-select: minor
---

Added `.orderBy()` and `.filter()` to aggregate expressions (`groupConcat`/`stringAgg`, `arrayAgg`, `jsonAgg`, `jsonObjectAgg`), compiled as native `ORDER BY`/`FILTER` on PostgreSQL and SQLite and as `CASE WHEN` on MySQL `GROUP_CONCAT`. Successive `.filter()` calls AND together and successive `.orderBy()` calls append terms; both return a new expression.

Three invalid combinations now fail in the library instead of at the database: criteria that compile to an empty condition (e.g. `.filter({})`, which would otherwise have silently aggregated every row), a MySQL `DISTINCT` aggregate combined with `.filter()` (previously emitted `CASE WHEN … THEN DISTINCT col`, rejected with ERROR 1064), and a PostgreSQL `DISTINCT` aggregate ordered by any column other than its own argument (rejected by PostgreSQL with 42P10). MySQL `jsonArrayAgg`/`jsonObjectAgg` expose no aggregate clauses, since MySQL supports neither for them.
