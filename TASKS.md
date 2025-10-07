# Tasks & GitHub Issues

This file tracks the current active tasks and provides links to detailed breakdowns.

## Legend
- 🔴 High Priority
- 🟡 Medium Priority
- 🟢 Low Priority / Nice to Have
- ✅ Completed
- 🔄 In Progress
- ⏸️ Blocked

---

## 🔄 Currently Active

### #28 - Support Table Name Alias 🔄
**Goal:** Allow aliasing table names for clearer queries (e.g., `FROM User AS u`).

**Status:** In Progress - Tests written, implementation next

**Syntax:**
```typescript
prisma.$from("User", "u")
  .join("Post", "authorId", "u.id", "p")
  .select("u.name")
  .select("p.title")
```

**Main Use Case:** Self-joins where same table is joined multiple times

**Details:** See [sub-tasks/high-priority.md](./sub-tasks/high-priority.md#28---support-table-name-alias)

---

## 🔴 High Priority (Not Started)

### [NEW] - Common Table Expressions (CTE) Support
Support WITH clauses for CTEs including recursive CTEs.

**Details:** See [sub-tasks/high-priority.md](./sub-tasks/high-priority.md#new---common-table-expressions-cte-support)

---

### #32 - Support SELECT * OVER (Window Functions)
Support window functions with OVER clause.

**Status:** Research completed (see `ISSUE-32-NOTES.md`)

**Details:** See [sub-tasks/high-priority.md](./sub-tasks/high-priority.md#32---support-select--over-window-functions)

---

### #30 - Where: Support for Array of Values
Support array-based filtering: `WHERE User.id IN [1, 2, 3]`

**Details:** See [sub-tasks/high-priority.md](./sub-tasks/high-priority.md#30---where-support-for-array-of-values-in-operator)

---

### #29 - whereRaw Support Prisma.sql
Support Prisma's tagged template literals for SQL injection-safe raw queries.

**Details:** See [sub-tasks/high-priority.md](./sub-tasks/high-priority.md#29---whereraw-support-prismasql)

---

## ✅ Recently Completed

### #27 - Support Select Column Alias ✅
**Completed in:** PR #37 (merged to main)

Two-parameter syntax: `.select("User.name", "username")` with full type safety.

**Details:** See [sub-tasks/high-priority.md](./sub-tasks/high-priority.md#27---support-select-column-alias--completed)

---

### #31 - Allow select * for table ✅
**Completed in:** PR #36 (merged to main)

Syntax `.select("Table.*")` to select all columns from a specific table.

**Details:** See [sub-tasks/medium-priority.md](./sub-tasks/medium-priority.md#31---allow-select--for-table--completed)

---

## 📋 Task Breakdown by Priority

For detailed breakdowns of all tasks, see:

- **🔴 High Priority:** [sub-tasks/high-priority.md](./sub-tasks/high-priority.md)
- **🟡 Medium Priority:** [sub-tasks/medium-priority.md](./sub-tasks/medium-priority.md)
- **🟢 Low Priority:** [sub-tasks/low-priority.md](./sub-tasks/low-priority.md)
- **🧪 Infrastructure:** [sub-tasks/infrastructure.md](./sub-tasks/infrastructure.md)

---

## 📝 Development Notes

### Testing Strategy
- Always add test cases in `packages/usage/tests/`
- Run `pnpm test:ts` to verify TypeScript types compile correctly
- Run `pnpm test` to verify runtime behavior
- Use existing schema in `packages/usage/prisma/schema.prisma` or extend it

### Documentation
- Update `README.md` for user-facing features
- Update `CLAUDE.md` for significant architectural changes
- Keep `TASKS.md` updated as issues progress

### Development Workflow
1. Create branch: `issue-XX-description`
2. Write tests first (TDD approach when possible)
3. Implement feature
4. Update documentation
5. Create PR linking to issue

### Priority Recommendation
1. **Quick Wins:** #1 (selectAllOmit), #3/#11 (type narrowing verification)
2. **High Value:** #28 (Table aliases - in progress), #2 (Join variations), #29 (Prisma.sql)
3. **Major Features:** CTE Support, Window Functions, Many-to-Many joins
4. **Infrastructure:** #18 (CI improvements), #20 (Publishing)
