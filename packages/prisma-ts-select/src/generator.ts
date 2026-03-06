import {type ConnectorType, type DMMF, generatorHandler} from '@prisma/generator-helper'
import type { GeneratorOptions } from '@prisma/generator-helper'
import { logger } from '@prisma/internals'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { GENERATOR_NAME } from './constants.js'
import { writeFileSafely } from './utils/writeFileSafely.js'
import { createRequire } from "node:module";
import type {DBType} from "./utils/types.js";
import fs from "node:fs";
const _require = createRequire(import.meta.url);


const SupportedProviders : Record<ConnectorType, boolean> = {
  sqlite: true,
  mysql: true,
  postgresql: true,
  "prisma+postgres": false,
  cockroachdb: false,
  mongodb: false,
  postgres: false,
  sqlserver: false
};

generatorHandler({
  onManifest() {
    logger.info(`${GENERATOR_NAME}:Registered`);
    return {
      defaultOutput: '',
      prettyName: GENERATOR_NAME,
    }
  },
  onGenerate: async (options: GeneratorOptions) => {
    const provider = options.datasources[0]?.provider;
    const output = options.generator.output?.value;

    if(!output) throw new Error(`${GENERATOR_NAME}: No output directory found. Please add an output directory to your schema.prisma file.`)

    const outputPath = path.resolve(output);
    const packageName = (options.generator.config.packageName as string | undefined) ?? generatePackageName(outputPath);

    fs.mkdirSync(outputPath, { recursive: true });

    console.log(`${GENERATOR_NAME}: Generating to ${outputPath}`);

    const validDS = options
        .datasources
        .map(ds => ds.provider)
        .filter(type => SupportedProviders[type]);

    if (validDS.length === 0) {
      throw new Error(`${GENERATOR_NAME}: Supported DataSource Providers are: ${Object.entries(SupportedProviders).reduce<Array<string>>((acc, [name, supported]) => {
        if(!supported) return acc;
        acc.push(name);
        return acc;
      }, []).join(", ")}`)
    }
    const modelToId:Record<string, [string, string]> = {};

    type InnerOutType ={
      fields: Record<string, string>;
      relations: Record<string, Record<string, Array<string>>>
    };
    type OutType = Record<string, InnerOutType>;

    const models = options.dmmf.datamodel.models.reduce<OutType>((acc, model) => {
      const modelObj = acc[model.name] = acc[model.name] ?? ({
        fields: {},
        relations: {},
      } as InnerOutType);


      for (const field of model.fields) {
        if (field.kind !== "object") {
          if (field.isId) modelToId[model.name] = [field.name, field.type];
          modelObj.fields = modelObj.fields ?? {};
          modelObj.fields[field.name] = (!field.isRequired ? "?" : "") + field.type;
        }
        else {
          if ((field.relationFromFields && field.relationFromFields.length > 0) && (field.relationToFields && field.relationToFields.length > 0)) {

            const fieldObj = modelObj.relations[field.type] = modelObj.relations[field.type] ?? {};
            field.relationFromFields.forEach((relationFromField, i) => {
              if (!field.relationToFields) return;
              const relationToField = field.relationToFields[i];
              if (!relationToField) return;

              fieldObj[relationFromField] = fieldObj[relationFromField] || [];
              fieldObj[relationFromField].push(relationToField);

              const accModel = acc[field.type] = acc[field.type] ?? ({} as InnerOutType);
              const accModelRelations = accModel.relations = accModel.relations ?? {};
              const accModelRelationToModel = accModelRelations[model.name] = accModelRelations[model.name] ?? {};
              const relationFromFieldList = accModelRelationToModel[relationToField] = accModelRelationToModel[relationToField] ?? [];
              relationFromFieldList.push(relationFromField);
            })
          }
          else {

            if (!isManyToManyRelationShip(field)) continue;

            const joinTableName = "_"+field.relationName;

            const joinTableModel = acc[joinTableName] = acc[joinTableName] ?? ({
              fields: {
                "A": "",
                "B": "",
              },
              relations: {},
            } as InnerOutType);


            const abJoin = [field.type, model.name].toSorted().indexOf(model.name) === 0 ? "A" : "B";

            const [idName, idType] =  getModelId(model.name);

            joinTableModel.fields[abJoin] = idType;


            {
              const mr = joinTableModel.relations[model.name] = joinTableModel.relations[model.name] ?? {};
              const mrt = mr[abJoin] = mr[abJoin] ?? [];
              mrt.push(idName);
            }


            const m = modelObj.relations[joinTableName] = modelObj.relations[joinTableName] ?? {};
            const mf = m[idName] = m[idName] ?? [];
            mf.push(abJoin);
          }

        }
      }

      return acc;
    }, {});


    const pTSSelPath = path.dirname(_require.resolve('prisma-ts-select'));
    logger.info("pTSSelPath", pTSSelPath);

    const srcDir = path.join(pTSSelPath, "extend");
    // const outDir = path.join(pTSSelPath, "..", "built");

    const hasVersions = provider !== 'sqlite'; // mysql + pg only

    // Copy dialect files - both .js and .d.ts for types, shared, and provider-specific
    const dialectFiles = [
      "types", "shared", provider,
      ...(hasVersions ? [`${provider}-v6`, `${provider}-v7`] : [])
    ];
    const dialectOutDir = path.join(outputPath, "dialects");
    fs.mkdirSync(dialectOutDir, {recursive: true});

    for (const baseName of dialectFiles) {
      for (const ext of ['.js', '.d.ts']) {
        const src = path.join(pTSSelPath, "extend", "dialects", `${baseName}${ext}`);
        const dest = path.join(dialectOutDir, `${baseName}${ext}`);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }
    }

    // Generate dialects/index.js — default = v7 for mysql/pg, base for sqlite
    const defaultCtxFns = hasVersions ? `${provider}V7ContextFns` : `${provider}ContextFns`;
    const defaultSrc = hasVersions ? `${provider}-v7` : provider;
    const dialectIndexJs = `export { ${provider}Dialect as dialect, ${defaultCtxFns} as dialectContextFns } from './${defaultSrc}.js';\n`;
    fs.writeFileSync(path.join(dialectOutDir, "index.js"), dialectIndexJs);

    const dialectIndexDts = `export { type Dialect, type FunctionRegistry, SUPPORTED_PROVIDERS, type SupportedProvider } from './types.js';
export { sharedFunctions } from './shared.js';
export { ${provider}Dialect as dialect, ${provider}Dialect, ${defaultCtxFns} as dialectContextFns } from './${defaultSrc}.js';
`;
    fs.writeFileSync(path.join(dialectOutDir, "index.d.ts"), dialectIndexDts);

    // Generate versioned v6/v7 dialect files (all providers)
    for (const ver of ['v6', 'v7'] as const) {
      const ctxName = hasVersions
        ? `${provider}${ver === 'v6' ? 'V6' : 'V7'}ContextFns`
        : `${provider}ContextFns`;
      const srcFile = hasVersions ? `${provider}-${ver}` : provider;
      const js = `export { ${provider}Dialect as dialect, ${ctxName} as dialectContextFns } from './${srcFile}.js';\n`;
      const dts = `export { type Dialect, type FunctionRegistry, SUPPORTED_PROVIDERS, type SupportedProvider } from './types.js';
export { sharedFunctions } from './shared.js';
export { ${provider}Dialect as dialect, ${provider}Dialect, ${ctxName} as dialectContextFns } from './${srcFile}.js';
`;
      fs.writeFileSync(path.join(dialectOutDir, `${ver}.js`), js);
      fs.writeFileSync(path.join(dialectOutDir, `${ver}.d.ts`), dts);
    }

    // Copy extend.js and inject DB model (ESM-only)
    const extendContents = fs.readFileSync(path.join(srcDir, 'extend.js'), {encoding: 'utf-8'});
    writeFileSafely(
      path.join(outputPath, 'extend.js'),
      extendContents.replace('var DB = {};', `var DB = ${JSON.stringify(models, null, 2)};`)
    );

    const declaration = generateReadonlyDeclaration(models);

    // Dialect join method support matrix (mirrors supportedJoinMethods in each dialect file)
    const ALL_JOIN_METHODS = [
      "join", "joinUnsafeTypeEnforced", "joinUnsafeIgnoreType",
      "innerJoin", "innerJoinUnsafeTypeEnforced", "innerJoinUnsafeIgnoreType",
      "leftJoin", "leftJoinUnsafeTypeEnforced", "leftJoinUnsafeIgnoreType",
      "rightJoin", "rightJoinUnsafeTypeEnforced", "rightJoinUnsafeIgnoreType",
      "fullJoin", "fullJoinUnsafeTypeEnforced", "fullJoinUnsafeIgnoreType",
      "crossJoin", "crossJoinUnsafeTypeEnforced", "crossJoinUnsafeIgnoreType",
      "manyToManyJoin",
    ] as const;

    const SUPPORTED_JOIN_METHODS: Partial<Record<ConnectorType, readonly string[]>> = {
      sqlite: [
        "join", "joinUnsafeTypeEnforced", "joinUnsafeIgnoreType",
        "innerJoin", "innerJoinUnsafeTypeEnforced", "innerJoinUnsafeIgnoreType",
        "leftJoin", "leftJoinUnsafeTypeEnforced", "leftJoinUnsafeIgnoreType",
        "crossJoin", "crossJoinUnsafeTypeEnforced", "crossJoinUnsafeIgnoreType",
        "manyToManyJoin",
      ],
      mysql: [
        "join", "joinUnsafeTypeEnforced", "joinUnsafeIgnoreType",
        "innerJoin", "innerJoinUnsafeTypeEnforced", "innerJoinUnsafeIgnoreType",
        "leftJoin", "leftJoinUnsafeTypeEnforced", "leftJoinUnsafeIgnoreType",
        "rightJoin", "rightJoinUnsafeTypeEnforced", "rightJoinUnsafeIgnoreType",
        "crossJoin", "crossJoinUnsafeTypeEnforced", "crossJoinUnsafeIgnoreType",
        "manyToManyJoin",
      ],
      postgresql: ALL_JOIN_METHODS,
    };

    const supportedMethods = (provider ? SUPPORTED_JOIN_METHODS[provider] : undefined) ?? ALL_JOIN_METHODS;
    const omittedMethods = ALL_JOIN_METHODS.filter(m => !supportedMethods.includes(m));

    // Copy extend.d.ts and inject DB model (ESM-only)
    const extendDts = fs.readFileSync(path.join(srcDir, 'extend.d.ts'), {encoding: 'utf-8'});
    const PLACEHOLDER = 'type SelectFnContext<_TSources extends TArrSources, _TFields extends TFieldsType> = BaseSelectFnContext<_TSources, _TFields>;';
    // Matches `type _fJoinReturn<...> = ...;` regardless of RHS — robust to type signature changes.
    // The `export` keyword is stripped from .d.ts by tsup, so match without it.
    const JOIN_RETURN_RE = /type _fJoinReturn<[^>]+>[^;]+;/;
    const joinReturnReplacement = omittedMethods.length > 0
      ? `type _fJoinReturn<TSources extends TArrSources, TFields extends TFieldsType, TCTEs extends Record<string, Record<string, any>> = {}> = Omit<_fJoin<TSources, TFields, TCTEs>, ${omittedMethods.map(m => `"${m}"`).join(' | ')}>;`
      : `type _fJoinReturn<TSources extends TArrSources, TFields extends TFieldsType, TCTEs extends Record<string, Record<string, any>> = {}> = _fJoin<TSources, TFields, TCTEs>;`;

    const replacedExtendDts = extendDts
      .replace('declare const DB: DBType;', declaration)
      .replace(
        PLACEHOLDER,
        `type SelectFnContext<_TSources extends TArrSources, _TFields extends TFieldsType> = Omit<BaseSelectFnContext<_TSources, _TFields>, keyof DialectFns<ColEntries<_TSources, _TFields>, WhereCriteria<_TSources, _TFields>>> & DialectFns<ColEntries<_TSources, _TFields>, WhereCriteria<_TSources, _TFields>>;`
      )
      .replace(JOIN_RETURN_RE, joinReturnReplacement);

    const dtsWithDialect = `import type { DialectFns } from './dialects/${provider}.js';\n` + replacedExtendDts;
    writeFileSafely(path.join(outputPath, 'extend.d.ts'), dtsWithDialect);

    // Generate versioned extend files (all providers)
    for (const ver of ['v6', 'v7'] as const) {
      const srcFile = hasVersions ? `${provider}-${ver}` : provider;
      writeFileSafely(path.join(outputPath, `extend-${ver}.js`), `export * from './extend.js';\nexport { default } from './extend.js';\n`);
      const vDts = `import type { DialectFns } from './dialects/${srcFile}.js';\n` + replacedExtendDts;
      writeFileSafely(path.join(outputPath, `extend-${ver}.d.ts`), vDts);
    }

    // Write package.json so the output dir can be consumed as a workspace package
    const pkg = {
      name: packageName,
      version: "0.0.0",
      type: "module",
      exports: {
        ".":            { types: "./extend.d.ts",         import: "./extend.js" },
        "./extend-v6":  { types: "./extend-v6.d.ts",      import: "./extend-v6.js" },
        "./extend-v7":  { types: "./extend-v7.d.ts",      import: "./extend-v7.js" },
        "./dialects":   { types: "./dialects/index.d.ts", import: "./dialects/index.js" },
        "./dialects/*": { types: "./dialects/*.d.ts",     import: "./dialects/*.js" },
      },
      sideEffects: false,
    };
    await writeFileSafely(path.join(outputPath, 'package.json'), JSON.stringify(pkg, null, 2));

    // Copy chunk .d.ts files (e.g. sql-expr-HASH.d.ts) that extend.d.ts imports
    for (const file of fs.readdirSync(srcDir)) {
      if (file !== 'extend.d.ts' && file !== 'extend.js' && file.endsWith('.d.ts')) {
        fs.copyFileSync(path.join(srcDir, file), path.join(outputPath, file));
      }
    }
    function isManyToManyRelationShip(field: DMMF.Field): boolean {
      if (!(field.kind === "object" && field.isList)) return false;
      const {type, relationName} = field;
      const typeModel = options.dmmf.datamodel.models.find(m => m.name === type);
      if (!typeModel) return false;
      if (!typeModel.fields.find(f => f.kind === "object" && f.isList && f.relationName === relationName)) return false;
      return true;
    }

    function getModelId(name: string) {
      if (!modelToId[name]) {
        for (const m of options.dmmf.datamodel.models) {
          if (m.name !== name) continue;
          for (const f of m.fields) {
            if (f.isId) {
              modelToId[m.name] = [f.name, f.type];
              break;
            }
          }
        }
      }
      const remoteId = modelToId[name];
      if (!remoteId) throw new Error(`Remote: Unable to find @id field for model, ${name}`);
      return remoteId;
    }
  },
})


function generatePackageName(outputPath: string): string {
  return 'prisma-ts-select-' + createHash('sha256').update(outputPath).digest('hex').slice(0, 8);
}

function generateReadonlyDeclaration(db: DBType) {
  const traverse = (obj : {} | null, level = 0) : string => {
    const indent = '\t'.repeat(level);
    const lines: Array<string> = [];

    if (obj === null) return lines.join("\n");

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        lines.push(`${indent}readonly ${key}: {`);
        lines.push(traverse(value, level + 1));
        lines.push(`${indent}};`);
      } else if (Array.isArray(value)) {
        lines.push(`${indent}readonly ${key}: [${value.map(v => `"${v}"`).join(', ')}];`);
      } else {
        lines.push(`${indent}readonly ${key}: "${value}";`);
      }
    }

    return lines.join('\n');
  };

  return `declare const DB: {\n${traverse(db, 1)}\n};`;
}

