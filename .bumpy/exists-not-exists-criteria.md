---
prisma-ts-select: minor
---

Added `exists` and `notExists` to `.where()` criteria, rendered as `EXISTS (…)` / `NOT EXISTS (…)` on every dialect. The operand is a query builder, or a callback whose `from()` opens a correlated subquery that can reference the outer query's columns through `$col` / `$colRaw`. Both keys compose with the other criteria and nest inside `$AND`, `$OR`, `$NOT` and `$NOR`. Type errors now cover subquery references to tables the outer query doesn't have, subquery tables that reuse an outer table's name or alias, and operands that are not query builders. At runtime, an operand that is not a query builder throws a `TypeError`. `exists` and `notExists` are now reserved keys, so a single-table query can't filter a column with either name through the criteria object.
