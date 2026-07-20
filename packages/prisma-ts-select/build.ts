import { build } from "esbuild";
import { execSync } from "node:child_process";
import { chmodSync } from "node:fs";

// Generator + CLI — CJS (Prisma deps are CJS-only)
const importMetaShim = `const __import_meta_url = require("url").pathToFileURL(__filename).href;`;
await build({
  entryPoints: ["src/bin.ts", "src/generator.ts"],
  outdir: "dist",
  format: "cjs",
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  target: "node20",
  external: ["@prisma/*", "ts-pattern"],
  define: { "import.meta.url": "__import_meta_url" },
  banner: { js: importMetaShim },
});
chmodSync("dist/bin.cjs", 0o755);

// Extend + Dialects — ESM, bundle only node_modules (ts-pattern), keep sibling imports external
await build({
  entryPoints: [
    "src/extend.ts",
    "src/db.ts",
    "src/dialects/types.ts",
    "src/dialects/shared.ts",
    "src/dialects/sqlite.ts",
    "src/dialects/mysql.ts",
    "src/dialects/mysql-v6.ts",
    "src/dialects/mysql-v7.ts",
    "src/dialects/postgresql.ts",
    "src/dialects/postgresql-v6.ts",
    "src/dialects/postgresql-v7.ts",
    "src/dialects/index.ts",
  ],
  outdir: "dist/extend",
  format: "esm",
  bundle: true,
  splitting: false,
  platform: "node",
  target: "node18",
  treeShaking: true,
  external: ["@prisma/*"],
  plugins: [{
    name: "externalize-siblings",
    setup(b) {
      // Keep relative imports external so the generator can swap them at generate-time
      b.onResolve({ filter: /^\./ }, (args) => {
        if (args.importer === "") return; // entry point itself
        return { path: args.path.replace(/\.ts$/, ".js"), external: true };
      });
    },
  }],
});

// Type declarations
execSync("tsc -p tsconfig.generator.json", { stdio: "inherit" });
execSync("tsc -p tsconfig.extend.json", { stdio: "inherit" });
