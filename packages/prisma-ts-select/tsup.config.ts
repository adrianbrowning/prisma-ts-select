import { defineConfig } from 'tsup';

/*
"build1": "tsup-node src/bin.ts src/generator.ts --dts --format esm,cjs --outDir dist ",
    "build2": "tsup-node src/extend.ts --dts --format esm,cjs --outDir dist  --external generator-build/db.ts",
    "build3": "tsup-node src/generator-build/db.ts --dts --format esm,cjs --outDir dist/generator-build",
 */

export default defineConfig((options) => [
    {
        entry: ["src/bin.ts", "src/generator.ts"],
        splitting: true,
        minify: false,
        format: ['cjs', "esm"],
        dts: true,
        treeshake: true,
        sourcemap: false,
        clean: false,
        outDir: "dist",
        platform: 'node',
        target: 'node20',
    },
    {
        entry: [
            'src/extend.ts',
            'src/dialects/types.ts',
            'src/dialects/shared.ts',
            'src/dialects/sqlite.ts',
            'src/dialects/mysql.ts',
            'src/dialects/postgresql.ts',
            'src/dialects/index.ts',
        ],
        outDir: 'dist/extend',
        splitting: false,
        minify: false,
        format: ['cjs', "esm"],
        treeshake: true,
        sourcemap: false,
        clean: false,
        dts: true,
        external: [
            '@prisma/client',
            '@prisma/client/extension',
            './dialects/sqlite.js',
            './dialects/mysql.js',
            './dialects/postgresql.js',
        ],
        noExternal: ['ts-pattern'],
        // platform: 'node',
        // target: 'node20', // Sync with `runs.using` in action.yml
    },
]);
