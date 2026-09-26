---
prisma-ts-select: patch
---

Fixed the SQLite `jsonExtract` result type: it is now `string | number | bigint | null`, matching what SQLite returns (objects and arrays as JSON text, integers and booleans as bigint).
