import { generatorHandler } from '@prisma/generator-helper'
import type { GeneratorOptions } from '@prisma/generator-helper'
import { logger } from '@prisma/sdk'
import path from 'node:path'
import { GENERATOR_NAME } from './constants.js'
import { writeFileSafely } from './utils/writeFileSafely.js'
import { createRequire } from "module";
import type {DBType} from "./utils/types.js";
import fs from "node:fs";
const require = createRequire(import.meta.url);


generatorHandler({
  onManifest() {
    logger.info(`${GENERATOR_NAME}:Registered`)
    return {
      defaultOutput: '../generated',
      prettyName: GENERATOR_NAME,
    }
  },
  onGenerate: async (options: GeneratorOptions) => {
    logger.info(`Starting Generation`);
    const modelToId:Record<string, string> = {};

    type InnerOutType ={
      fields: Record<string, string>;
      relations: Record<string, Record<string, Array<string>>>
    };
    type OutType = Record<string, InnerOutType>;

    const models = options.dmmf.datamodel.models.reduce<OutType>((acc, model) => {
      const modelObj = acc[model.name] = acc[model.name] ?? ({} as InnerOutType);



      modelObj.fields = model.fields.reduce<Record<string, string>>((acc2, field) => {
        if (field.kind === "object") return acc2;
        if (field.isId) modelToId[model.name] = field.name;
        acc2[field.name] = (!field.isRequired ? "?" : "") + field.type;
        return acc2;
      }, {});
      modelObj.relations = model.fields.reduce<Record<string, Record<string, Array<string>>>>((acc2, field) => {
        if (field.kind !== "object") return acc2;
        if (!field.relationFromFields) return acc2;
        if (!field.relationToFields) return acc2;

        const fieldObj = acc2[field.type] = acc2[field.type]  ?? {};
        field.relationFromFields.forEach((rFF, i) => {
          if (!field.relationToFields) return;
          const rTF = field.relationToFields[i];
          if (!rTF) return;

          fieldObj[rFF] = fieldObj[rFF] || [];
          fieldObj[rFF].push(rTF);

          //acc[field.type] = acc[field.type] ?? {};
          //acc[field.type].relations = acc[field.type].relations ?? {};
          // acc[field.type].relations[model.name] = acc[field.type].relations[model.name] ?? {};
          // acc[field.type].relations[model.name][rTF] = acc[field.type].relations[rTF] ?? [];
          // acc[field.type].relations[model.name][rTF].push(rFF);



          const m = acc[field.type] = acc[field.type] ?? ({} as InnerOutType);
          const r = m.relations = m.relations ?? {};
          const rm = r[model.name] = r[model.name] ?? {};
          const rmf = rm[rTF] = rm[rTF] ?? [];
          rmf.push(rFF);
        })
        return acc2;
      }, {})
      return acc;
    }, {})

    const pTSSelPath = path.dirname(require.resolve('prisma-ts-select'));
    logger.info("pTSSelPath", pTSSelPath);

    const srcDir = path.join(pTSSelPath, "extend");
    const outDir = path.join(pTSSelPath, "..", "built");

    { //mjs
      const file = "extend.js";
      const contents = fs.readFileSync(path.join(srcDir, file), {encoding: "utf-8"});

      writeFileSafely(path.join(outDir, file),
          contents.replace("const DB = {};",
              `const DB = ${JSON.stringify(models, null, 2)};`));
    }

    { //cjs
      const file = "extend.cjs";
      const contents = fs.readFileSync(path.join(srcDir, file), {encoding: "utf-8"});

      writeFileSafely(path.join(outDir, file),
          contents.replace("const DB = {};",
              `const DB = ${JSON.stringify(models, null, 2)};`));
    }


    // await writeFileSafely(path.join(pTSSelPath,"generator-build","db.d.ts"), `export const DB = ${JSON.stringify(models, null, 2)} as const satisfies Record<string, { fields: Record<string, string>; relations: Record<string, Record<string, Array<string>>> }>`+";");

    const declaration = generateReadonlyDeclaration(models);

    { //d.ts
      const file = "extend.d.ts";
      const contents = fs.readFileSync(path.join(srcDir, file), {encoding: "utf-8"});

      writeFileSafely(path.join(outDir, file),
          contents
              .replace("declare const DB: DBType;",declaration)
      );
    }

    { //d.ts
      const file = "extend.d.cts";
      const contents = fs.readFileSync(path.join(srcDir, file), {encoding: "utf-8"});

      writeFileSafely(path.join(outDir, file),
          contents
              .replace("declare const DB: DBType;",declaration)
      );
    }

  },
})


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

