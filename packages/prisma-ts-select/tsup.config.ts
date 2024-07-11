import { defineConfig } from 'tsup';

/*
"build1": "tsup-node src/bin.ts src/generator.ts --dts --format esm,cjs --outDir dist ",
    "build2": "tsup-node src/extend.ts --dts --format esm,cjs --outDir dist  --external generator-build/db.ts",
    "build3": "tsup-node src/generator-build/db.ts --dts --format esm,cjs --outDir dist/generator-build",
 */

export default defineConfig((options) => [
    {
        // entry: {
        //     bin: 'bin-src/register.js',
        //     node: 'node-src/index.ts',
        // },
        entry: ["src/bin.ts", "src/generator.ts"],
        splitting: true,
        minify: true,
        format: ['cjs', "esm"],
        // dts: {
        //     entry: { node: 'node-src/index.ts' },
        //     resolve: true,
        // },
        dts: true,
        treeshake: true,
        sourcemap: true,
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
    /*{
        entry: ['src/generator-build/db.ts'],
        outDir: 'dist/generator-build/',
        splitting: false,
        minify: false,
        format: ['cjs', "esm"],
        treeshake: true,
        sourcemap: false,
        clean: false,
        dts: true,
        // platform: 'node',
        // target: 'node20', // Sync with `runs.using` in action.yml
    },*/
]);
