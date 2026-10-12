# prisma-ts-select


## 0.5.0
<sub>2026-09-05</sub>

- [#208](https://github.com/adrianbrowning/prisma-ts-select/pull/208)  *(minor)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)! - Adding support for Recursive CTEs
- [#209](https://github.com/adrianbrowning/prisma-ts-select/pull/209)  *(minor)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)! - Adding typed `$union` / `$unionAll` query composition
- [#182](https://github.com/adrianbrowning/prisma-ts-select/pull/182)  *(patch)* Thanks [@adrianbrowning](https://github.com/adrianbrowning)! - Reworked to remove a @ts-expect-error

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
