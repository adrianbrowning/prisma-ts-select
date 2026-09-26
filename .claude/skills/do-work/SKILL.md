---
name: do-work
description: Executes a unit of work in prisma-ts-select: plan, implement, lint/type-check/test feedback loop, then commit. Use when asked to implement a feature, fix a bug, or complete a task in this repository.
---

# Do Work

Structured workflow for completing a unit of work in this repository.

## Workflow

### 1. Plan

Before touching code:
- Restate the task as a verifiable target ("done when X")
- Identify affected packages (prisma-ts-select, run-tests-tui, @gcm/usage-sqlite-v6, @gcm/usage-sqlite-v7, @gcm/usage-mysql-v6, @gcm/usage-mysql-v7, @gcm/usage-pg-v6, @gcm/usage-pg-v7)
- List files to create/modify
- Surface ambiguities — ask before proceeding if any exist
- For 3+ file changes or architectural decisions, use Plan mode

### 2. Implement

- Surgical changes — touch only what the task requires
- Follow existing patterns in affected package (see CLAUDE.md)
- TypeScript strict mode (incl. `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`) — no `any`, no `@ts-ignore`
- ESM only (`"type": "module"`); relative imports use explicit `.ts` extensions (`./db.ts`)
- `verbatimModuleSyntax` is on — use `import type` for type-only imports
- Internal deps use `workspace:` protocol (e.g. `"prisma-ts-select": "workspace:prisma-ts-select@*"`)

#### Back-end code

Use **tracer-bullet TDD** with a **Make it Work → Make it Right → Make it Fast** loop:

1. **Pick one behaviour** — the smallest vertical slice that proves the feature works end-to-end
2. **RED** — write one failing test for that behaviour only. Run it, confirm it fails for the right reason
3. **GREEN (Make it Work)** — write the minimum code to pass that test. No polish, no abstraction
4. **Repeat** — next behaviour only after current slice is green + refactored
5. **REFACTOR (Make it Right)** — clean up without changing behaviour; tests must stay green
6. **Make it Fast** — only after all behaviours are green and clean; profile before optimising

Rules:
- One test at a time — never write a second failing test while one is already red
- Tracer bullet first: get a thin path from input → output → Prisma/DB before filling in edge cases
- If a test proves impossible to write cleanly, the design is wrong — fix the design

#### Front-end code (if any)

Skip TDD loop — implement directly, verify visually in browser. Run lint/type-check as normal.

### 3. Feedback Loop

Run in order, fix before proceeding to next:

```bash
pnpm lint:ts                                  # typecheck all packages
pnpm lint:esl && pnpm lint:s                  # eslint rules + style
pnpm --filter prisma-ts-select test           # generator/runtime unit tests
pnpm --filter prisma-ts-select build && pnpm -r gen   # regenerate usage clients after src changes
pnpm test:all                                 # usage packages across dialects (or: pnpm --filter @gcm/usage-sqlite-v7 test)
```

Autofix style with `pnpm lint:fix`; autofix eslint rules with `pnpm lint:esl:fix`. `pnpm lint` (typecheck + style) also runs on pre-push.

Iterate until all pass (or a step is skipped because it does not apply).

### 4. Commit

Stage only files changed by this task. Write a **Conventional Commits** message:

```
<type>(<scope>): <short imperative summary>

[optional body — why, not what]
```

**Types:** `feat` | `fix` | `refactor` | `test` | `chore` | `docs` | `perf` | `ci`

**Scope:** package name or domain

**Examples:**
```
feat(auth): add token refresh on 401
fix(worker): prevent duplicate message deletion on retry
refactor(api): extract request-validation into shared util
chore(deps): upgrade prisma to 6.x
```

Rules:
- Subject ≤ 72 chars, lowercase type/scope, no trailing period
- Use body for non-obvious motivation, not task IDs
- One logical change per commit
