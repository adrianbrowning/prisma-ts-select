import { Command } from 'commander'

export type RunConfig = {
  versions: ('6' | '7')[]
  dbs: ('sqlite' | 'mysql' | 'pg')[]
  skipBuild: boolean
  resetDb: boolean
  seedOnly: boolean
  testPattern: string | null
}

export function parseArgs(argv: string[] = process.argv): RunConfig {
  const program = new Command()
    .name('run-tests')
    .description('Run prisma-ts-select tests with live TUI')
    .option('--version <ver>', 'Prisma version: 6 or 7')
    .option('--db <db>', 'Database: sqlite, mysql, or pg')
    .option('--skip-build', 'Skip prisma-ts-select build step', false)
    .option('--reset-db', 'Run p:r before tests (reset + seed)', false)
    .option('--seed-only', 'Spin up DBs + seed, then exit', false)
    .option('--test <glob>', 'Run specific test file/glob (skips lint:ts)')
    .addHelpText('after', `
Examples:
  run-tests --db sqlite --skip-build
  run-tests --version 6
  run-tests --version 6 --db sqlite
  run-tests --test './tests/core/select.spec.ts' --db sqlite --skip-build
  run-tests --reset-db
  run-tests --seed-only --db pg
`)
  program.parse(argv)
  const opts = program.opts() as Record<string, unknown>

  if (opts['version'] != null && !['6', '7'].includes(opts['version'] as string)) {
    console.error(`Error: --version must be 6 or 7, got "${opts['version']}"`)
    process.exit(1)
  }
  if (opts['db'] != null && !['sqlite', 'mysql', 'pg'].includes(opts['db'] as string)) {
    console.error(`Error: --db must be sqlite, mysql, or pg, got "${opts['db']}"`)
    process.exit(1)
  }

  const versions: ('6' | '7')[] = opts['version'] != null
    ? [opts['version'] as '6' | '7']
    : ['6', '7']

  const dbs: ('sqlite' | 'mysql' | 'pg')[] = opts['db'] != null
    ? [opts['db'] as 'sqlite' | 'mysql' | 'pg']
    : ['sqlite', 'mysql', 'pg']

  return {
    versions,
    dbs,
    skipBuild: opts['skipBuild'] as boolean,
    resetDb: opts['resetDb'] as boolean,
    seedOnly: opts['seedOnly'] as boolean,
    testPattern: (opts['test'] as string | undefined) ?? null,
  }
}
