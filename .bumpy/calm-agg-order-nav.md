---
prisma-ts-select: patch
---

Aggregate `.orderBy()` now autocompletes its column the way `.select()` does: `Table.` prefixes and unambiguous bare columns first, then that table's columns once `Table.` is typed. Before, it listed every qualified column in scope at once. The set of accepted columns is unchanged.
