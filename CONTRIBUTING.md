# Contributing

## Development

```bash
pnpm i
pnpm --filter prisma-ts-select build
pnpm -r gen
```

## Testing

### Writing Tests
Testing the SQL query output, we should use the pattern
```ts
expectSQL(
  query.getSQL(),
  `SELECT ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("username", true)} FROM ${dialect.quote("User")};`
);
```


### Running Tests

```bash
pnpm --filter prisma-ts-select test && pnpm run-tests [--version 6|7] [--db sqlite|mysql|pg] [--skip-build] [--reset-db] [--test <glob>]
```

## Release Intent

Every PR that changes publishable behaviour needs a **bump file** — a small markdown file in `.bumpy/` that declares the version bump level and a changelog entry.

```bash
pnpm bump          # interactive — creates .bumpy/<slug>.md
pnpm bump:status   # preview what the next release looks like
```

If a PR doesn't need a release (docs-only, CI, tests), apply the `no-bump` label.

## Release Flow

1. Feature PRs merge to `main` with bump files.
2. A "Version Packages" PR is automatically kept up-to-date with the aggregated changelog.
3. Updates to that PR publish `@next` prereleases (`x.y.z-rc.N`) for early testing.
4. Merging the Version Packages PR publishes the stable release to npm.
