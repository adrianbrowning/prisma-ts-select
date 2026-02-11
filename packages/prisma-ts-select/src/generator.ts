import {type ConnectorType, DMMF, generatorHandler} from '@prisma/generator-helper'
import type { GeneratorOptions } from '@prisma/generator-helper'
import { logger } from '@prisma/internals'
import path from 'node:path'
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
  cockroachdb: false,
  mongodb: false,
  postgres: false,
  sqlserver: false
};

generatorHandler({
  onManifest() {
    logger.info(`${GENERATOR_NAME}:Registered`);
    return {
      defaultOutput: '../generated',
      prettyName: GENERATOR_NAME,
    }
  },
  onGenerate: async (options: GeneratorOptions) => {
    const provider = options.datasources[0]?.provider;

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

      // if (model.name === "MFId_Post") debugger;

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

            debugger;
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

            // TODO
            // const fieldObj = modelObj.relations[joinTableName] = modelObj.relations[joinTableName] ?? {};
            //
            // fieldObj[relationFromField] = fieldObj[relationFromField] || [];
            // fieldObj[relationFromField].push(relationToField);
            //
            // const accModel = acc[field.type] = acc[field.type] ?? ({} as InnerOutType);
            // const accModelRelations = accModel.relations = accModel.relations ?? {};
            // const accModelRelationToModel = accModelRelations[model.name] = accModelRelations[model.name] ?? {};
            // const relationFromFieldList = accModelRelationToModel[relationToField] = accModelRelationToModel[relationToField] ?? [];
            // relationFromFieldList.push(relationFromField);

            // if(model.name === "User") debugger;

            /*let relationString = "";
            if (!modelToId[model.name]) {
              for (const f of model.fields) {
                if (f.isId) {
                  modelToId[model.name] = f.name;
                  break;
                }
              }
            }
            const localId = modelToId[model.name];
            if (!localId) {
              logger.info(`Skipping MF: ${model.name}.${field.name} [${field.relationName}]`);
              continue;
            }
            if (!localId) throw new Error(`Local: Unable to find @id field for model, ${model.name}`);
            // relationString += localId + ".";
            const abJoin = [field.type.toLowerCase(), model.name.toLowerCase()].sort().indexOf(field.type.toLowerCase()) === 0 ? "A" : "B";
            relationString +=  abJoin + "._" + field.relationName + "." + (abJoin === "A" ? "B" : "A") + ".";

            if (!modelToId[field.type]) {
              for (const m of options.dmmf.datamodel.models) {
                if (m.name !== field.type) continue;
                for (const f of m.fields) {
                  if (f.isId) {
                    modelToId[m.name] = f.name;
                    break;
                  }
                }
              }
            }
            const remoteId = modelToId[field.type];
            if (!remoteId) {
              logger.info(`Skipping FM:  ${model.name}.${field.name} > ${field.type}  [${field.relationName}] -> ${relationString}`);
              continue;
            }
            if (!remoteId) throw new Error(`Remote: Unable to find @id field for model, ${field.type}`);
            relationString += remoteId;

            const fieldObj = modelObj.relations[field.type] = modelObj.relations[field.type] ?? {};
            fieldObj[localId] = fieldObj[localId] || [];
            fieldObj[localId].push(relationString);*/
          }

        }
      }

      return acc;
    }, {});


    const pTSSelPath = path.dirname(_require.resolve('@gcm/prisma-ts-select'));
    logger.info("pTSSelPath", pTSSelPath);

    const srcDir = path.join(pTSSelPath, "extend");
    const outDir = path.join(pTSSelPath, "..", "built");

    // Copy dialect files
    const dialectFiles = ["types.js", "shared.js", "sqlite.js", "mysql.js", "postgresql.js", "index.js"];
    const dialectOutDir = path.join(outDir, "dialects");
    if (!fs.existsSync(dialectOutDir)) {
      fs.mkdirSync(dialectOutDir, {recursive: true});
    }
    for (const file of dialectFiles) {
      const src = path.join(pTSSelPath, "extend", "dialects", file);
      const dest = path.join(dialectOutDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }

    { //mjs
      const file = "extend.js";
      const contents = fs.readFileSync(path.join(srcDir, file), {encoding: "utf-8"});

      writeFileSafely(path.join(outDir, file),
          contents
              .replace("const dialect = sqliteDialect;", `const dialect = ${provider}Dialect;`)
              .replace("const DB = {};", `const DB = ${JSON.stringify(models, null, 2)};`));
    }

    { //cjs
      const file = "extend.cjs";
      const contents = fs.readFileSync(path.join(srcDir, file), {encoding: "utf-8"});

      writeFileSafely(path.join(outDir, file),
          contents
              .replace("const dialect = sqliteDialect;", `const dialect = ${provider}Dialect;`)
              .replace("const DB = {};", `const DB = ${JSON.stringify(models, null, 2)};`));
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

