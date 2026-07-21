// @ts-check
 
import childProcess from "node:child_process";
import fs, { existsSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function debug(message, ...optionalParams) {
  if (process.env.DEBUG && process.env.DEBUG === "prisma:postinstall") {
    console.log(message, ...optionalParams);
  }
}
/**
 * Adds `package.json` to the end of a path if it doesn't already exist'
 * @param {string} pth
 */
function addPackageJSON(pth) {
  if (pth.endsWith("package.json")) return pth;
  return path.join(pth, "package.json");
}

/**
 * Looks up for a `package.json` which is not `@prisma/cli` or `prisma` and returns the directory of the package
 * @param {string} startPath - Path to Start At
 * @param {number} limit - Find Up limit
 * @returns {string | null}
 */
function findPackageRoot(startPath, limit = 10) {
  if (!startPath || !fs.existsSync(startPath)) return null;
  let currentPath = startPath;
  // Limit traversal
  for (let i = 0; i < limit; i++) {
    const pkgPath = addPackageJSON(currentPath);
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = require(pkgPath);
        if (pkg.name && ![ "prisma-ts-select" ].includes(pkg.name)) {
          return pkgPath.replace("package.json", "");
        }
      }
      catch { /* package.json may be malformed — skip */ }
    }
    currentPath = path.join(currentPath, "../");
  }
  return null;
}

async function main() {
  const NM = "node_module";
  const require = createRequire(import.meta.url);
  const pathName = require.resolve("@prisma/client"/*'prisma-ts-select'*/);
  const NM_DIR = pathName.substring(0, pathName.lastIndexOf(NM)+NM.length)+path.sep;
  console.log("node_modules", NM_DIR);

  const ptsPath = await ensureDotPrismaExists(NM_DIR);
  if (!ptsPath) throw new Error("Something went wrong installing prisma-ts-select");

  const packageJson = path.join(ptsPath, "package.json");

  if (existsSync(packageJson)) {
    fs.unlinkSync(packageJson);
  }
  writeFileSync(packageJson, JSON.stringify({
    "name": ".prisma/prisma-ts-select",
    "main": "index.js",
    "types": "index.d.ts",
  }, null, 2));

  const indexDTS = path.join(ptsPath, "index.d.ts");
  if (!existsSync(indexDTS)) {
    writeFileSync(packageJson, ``);
  }

  const localPath = getLocalPackagePath();

  // this is needed, so that the Generate command does not fail in postinstall
  process.env.PRISMA_GENERATE_IN_POSTINSTALL = "true";
  // this is needed, so we can find the correct schemas in yarn workspace projects
  const root = findPackageRoot(localPath);
  process.env.PRISMA_GENERATE_IN_POSTINSTALL = root ? root : "true";
  debug({
    localPath,
    init_cwd: process.env.INIT_CWD,
    PRISMA_GENERATE_IN_POSTINSTALL: process.env.PRISMA_GENERATE_IN_POSTINSTALL,
  });
}

function getLocalPackagePath() {

  try {
    const packagePath = require.resolve("prisma-ts-select/package.json");
    if (packagePath) {
      return require.resolve("prisma-ts-select");
    }
  }
  catch { /* package not resolvable — expected during first install */ }

  return null;
}

function run(cmd, params, cwd = process.cwd()) {
  const child = childProcess.spawn(cmd, params, {
    stdio: [ "pipe", "inherit", "inherit" ],
    cwd,
  });

  return new Promise((resolve, reject) => {
    child.on("close", () => {
      resolve();
    });
    child.on("exit", code => {
      if (code === 0) {
        resolve();
      }
      else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    child.on("error", err => {
      reject(err);
    });
  });
}

async function ensureDotPrismaExists(nm_path) {
  const dotPrismaClientDir = path.join(nm_path, ".prisma");
  console.log("ensureDotPrismaExists", dotPrismaClientDir);
  if (!fs.existsSync(dotPrismaClientDir)) {
    throw new Error("Please make sure @prisma/client exists");
  }
  try {
    const p = path.join(dotPrismaClientDir, "prisma-ts-select");
    console.log("ensureDotPrismaExists", p);
    await makeDir(p);
    return p;
  }
  catch (e) {
    console.error(e);
  }
}

async function makeDir(input) {
  const make = async pth => {
    try {
      await mkdir(pth);

      return pth;
    }
    catch (error) {
      if (error.code === "EPERM") {
        throw error;
      }

      if (error.code === "ENOENT") {
        if (path.dirname(pth) === pth) {
          throw new Error(`operation not permitted, mkdir '${pth}'`);
        }

        if (error.message.includes("null bytes")) {
          throw error;
        }

        await make(path.dirname(pth));

        return make(pth);
      }

      try {
        const stats = await stat(pth);
        if (!stats.isDirectory()) {
          throw new Error("The path is not a directory");
        }
      }
      catch {
        throw error;
      }

      return pth;
    }
  };

  return make(path.resolve(input));
}

/**
 * Get the command that triggered this postinstall script being run. If there is
 * an error while attempting to get this value then the string constant
 * 'ERROR_WHILE_FINDING_POSTINSTALL_TRIGGER' is returned.
 * This information is just necessary for telemetry.
 * This get's passed in to Generate, which then automatically get's propagated to telemetry.
 */
function getPostInstallTrigger() {
  const maybe_npm_config_argv_string = process.env.npm_config_argv;

  if (maybe_npm_config_argv_string === undefined) {
    return UNABLE_TO_FIND_POSTINSTALL_TRIGGER__ENVAR_MISSING;
  }

  let npm_config_argv;
  try {
    npm_config_argv = JSON.parse(maybe_npm_config_argv_string);
  }
  catch (e) {
    return `${UNABLE_TO_FIND_POSTINSTALL_TRIGGER_JSON_PARSE_ERROR}: ${maybe_npm_config_argv_string}`;
  }

  if (typeof npm_config_argv !== "object" || npm_config_argv === null) {
    return `${UNABLE_TO_FIND_POSTINSTALL_TRIGGER_JSON_SCHEMA_ERROR}: ${maybe_npm_config_argv_string}`;
  }

  const npm_config_arv_original_arr = npm_config_argv.original;

  if (!Array.isArray(npm_config_arv_original_arr)) {
    return `${UNABLE_TO_FIND_POSTINSTALL_TRIGGER_JSON_SCHEMA_ERROR}: ${maybe_npm_config_argv_string}`;
  }

  const npm_config_arv_original = npm_config_arv_original_arr
    .filter(arg => arg !== "")
    .join(" ");

  const command =
    npm_config_arv_original === ""
      ? getPackageManagerName()
      : [ getPackageManagerName(), npm_config_arv_original ].join(" ");

  return command;
}

/**
 * Wrap double quotes around the given string.
 */
function doubleQuote(x) {
  return `"${x}"`;
}

/**
 * Get the package manager name currently being used. If parsing fails, then the following pattern is returned:
 * UNKNOWN_NPM_CONFIG_USER_AGENT(<string received>).
 */
function getPackageManagerName() {
  const userAgent = process.env.npm_config_user_agent;
  if (!userAgent) return "MISSING_NPM_CONFIG_USER_AGENT";

  const name = parsePackageManagerName(userAgent);
  if (!name) return `UNKNOWN_NPM_CONFIG_USER_AGENT(${userAgent})`;

  return name;
}

/**
 * Parse package manager name from useragent. If parsing fails, `null` is returned.
 */
function parsePackageManagerName(userAgent) {
  let packageManager = null;

  if (userAgent) {
    const matchResult = /^([^/]+)\/.+/.exec(userAgent);
    if (matchResult) {
      packageManager = matchResult[1].trim();
    }
  }

  return packageManager;
}

// prettier-ignore
const UNABLE_TO_FIND_POSTINSTALL_TRIGGER__ENVAR_MISSING = "UNABLE_TO_FIND_POSTINSTALL_TRIGGER__ENVAR_MISSING";
// prettier-ignore
const UNABLE_TO_FIND_POSTINSTALL_TRIGGER_JSON_PARSE_ERROR = "UNABLE_TO_FIND_POSTINSTALL_TRIGGER_JSON_PARSE_ERROR";
// prettier-ignore
const UNABLE_TO_FIND_POSTINSTALL_TRIGGER_JSON_SCHEMA_ERROR = "UNABLE_TO_FIND_POSTINSTALL_TRIGGER_JSON_SCHEMA_ERROR";

main()
  .then(_ => console.log(`COMPLETE`))
  .catch(e => console.log(`ERROR`, e));
