# prisma-ts-select

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
