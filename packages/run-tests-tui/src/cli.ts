import { Command } from "commander";

export type RunConfig = {
  versions: Array<"6" | "7">;
  dbs: Array<"sqlite" | "mysql" | "pg">;
  ci: boolean;
  coverage: boolean;
  skipBuild: boolean;
  resetDb: boolean;
  seedOnly: boolean;
  testPattern: string | null;
};

export function parseArgs(argv: Array<string> = process.argv): RunConfig {
  const program = new Command()
    .name("run-tests")
    .description("Run prisma-ts-select tests with live TUI")
    .option("--version <ver>", "Prisma version: 6 or 7")
    .option("--db <db>", "Database: sqlite, mysql, or pg")
    .option("--skip-build", "Skip prisma-ts-select build step", false)
    .option("--reset-db", "Run p:r before tests (reset + seed)", false)
    .option("--seed-only", "Spin up DBs + seed, then exit", false)
    .option("--test <glob>", "Run specific test file/glob (skips lint:ts)")
    .option("--ci", "Headless mode: JSON results to stdout, no TUI", false)
    .option("--coverage", "Run with coverage", false)
    .addHelpText("after", `
Examples:
  run-tests --db sqlite --skip-build
  run-tests --version 6
  run-tests --version 6 --db sqlite
  run-tests --test './tests/core/select.spec.ts' --db sqlite --skip-build
  run-tests --reset-db
  run-tests --seed-only --db pg
`);
  program.parse(argv);
  const opts = program.opts();

  if (opts["version"] != null && opts["version"] !== "6" && opts["version"] !== "7") {
    process.stderr.write(`Error: --version must be 6 or 7, got "${opts["version"]}"\n`);
    process.exit(1);
  }
  const validDbs = ["sqlite", "mysql", "pg"] as const;
  type DB = (typeof validDbs)[number];
  if (opts["db"] != null) {
    const parts = (opts["db"] as string).split(",");
    for (const p of parts) {
      if (!validDbs.includes(p as DB)) {
        process.stderr.write(`Error: --db must be comma-separated list of sqlite, mysql, pg — got "${p}"\n`);
        process.exit(1);
      }
    }
  }

  const versions: Array<"6" | "7"> = opts["version"] != null
    ? [ opts["version"] as "6" | "7" ]
    : [ "6", "7" ];

  const dbs: Array<DB> = opts["db"] != null
    ? (opts["db"] as string).split(",") as Array<DB>
    : [ "sqlite", "mysql", "pg" ];

  return {
    versions,
    dbs,
    ci: opts["ci"] as boolean,
    skipBuild: opts["skipBuild"] as boolean,
    coverage: opts["coverage"] as boolean,
    resetDb: opts["resetDb"] as boolean,
    seedOnly: opts["seedOnly"] as boolean,
    testPattern: (opts["test"] as string | undefined) ?? null,
  };
}
