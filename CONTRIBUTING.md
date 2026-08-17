# Contributing

## Development

```bash
pnpm i
pnpm --filter prisma-ts-select build
pnpm -r gen
```

## Testing

```bash
./run-tests.sh [--version 6|7] [--db sqlite|mysql|pg] [--skip-build] [--reset-db]
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
