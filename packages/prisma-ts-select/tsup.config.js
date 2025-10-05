"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tsup_1 = require("tsup");
/*
"build1": "tsup-node src/bin.ts src/generator.ts --dts --format esm,cjs --outDir dist ",
    "build2": "tsup-node src/extend.ts --dts --format esm,cjs --outDir dist  --external generator-build/db.ts",
    "build3": "tsup-node src/generator-build/db.ts --dts --format esm,cjs --outDir dist/generator-build",
 */
exports.default = (0, tsup_1.defineConfig)(function (options) { return [
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
        entry: ['src/extend.ts'],
        outDir: 'dist/extend',
        splitting: true,
        minify: false,
        format: ['cjs', "esm"],
        treeshake: true,
        sourcemap: false,
        clean: false,
        dts: true,
        external: [],
        bundle: false,
        // platform: 'node',
        // target: 'node20', // Sync with `runs.using` in action.yml
    },
]; });
