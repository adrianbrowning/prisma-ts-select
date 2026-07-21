import { spawn, execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import type { RunConfig } from "./cli.ts";
import type { Action, PanelState } from "./state.ts";

type Dispatch = (action: Action) => void;

const execFileAsync = promisify(execFile);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function makeTimestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

async function getBranchDbs(): Promise<{ v6: string; v7: string; }> {
  try {
    const result = await execFileAsync("git", [ "rev-parse", "--abbrev-ref", "HEAD" ]);
    const branch = result.stdout.trim();
    const safe = branch.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
      .slice(0, 60);
    return { v6: `${safe}_v6`, v7: `${safe}_v7` };
  }
  catch {
    return { v6: "local_v6", v7: "local_v7" };
  }
}

function getDbUrl(db: "mysql" | "pg", ver: "6" | "7", branchDbs: { v6: string; v7: string; }): string {
  const name = ver === "6" ? branchDbs.v6 : branchDbs.v7;
  if (db === "mysql") return `mysql://root:test@localhost:3306/${name}`;
  return `postgresql://postgres:test@localhost:5432/${name}?schema=public`;
}

async function runStep(
  cmd: Array<string>,
  opts: { env?: Record<string, string>; cwd?: string; },
  onLine: (line: string) => void
): Promise<number> {
  return new Promise(resolve => {
    const proc = spawn(cmd[0], cmd.slice(1), {
      env: { ...process.env, ...(opts.env ?? {}) },
      cwd: opts.cwd,
      stdio: [ "ignore", "pipe", "pipe" ],
    });

    let buffer = "";
    const flush = (chunk: Buffer): void => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) onLine(line);
    };

    proc.stdout.on("data", flush);
    proc.stderr.on("data", flush);
    proc.on("close", code => {
      if (buffer) onLine(buffer);
      resolve(code ?? 1);
    });
  });
}

async function execSimple(cmd: string, args: Array<string>): Promise<{ stdout: string; exitCode: number; }> {
  try {
    const result = await execFileAsync(cmd, args);
    return { stdout: result.stdout, exitCode: 0 };
  }
  catch (err: unknown) {
    const e = err as { stdout?: string; code?: number; };
    return { stdout: e.stdout ?? "", exitCode: e.code ?? 1 };
  }
}

async function runDocker(
  dbs: Array<string>,
  versions: Array<string>,
  branchDbs: { v6: string; v7: string; },
  dispatch: Dispatch
): Promise<boolean> {
  const needDocker = dbs.some(d => d === "mysql" || d === "pg");
  if (!needDocker) {
    dispatch({ type: "SET_DOCKER", status: "skipped" });
    return false;
  }

  dispatch({ type: "SET_DOCKER", status: "running" });

  const services: Array<"mysql" | "postgres"> = [];
   
  if (dbs.includes("mysql")) services.push("mysql");
   
  if (dbs.includes("pg")) services.push("postgres");

  const running = await execSimple("docker", [ "compose", "ps", "--services", "--filter", "status=running" ]);
  const runningSet = new Set(running.stdout.split("\n").filter(Boolean));
  const needStart = services.some(s => !runningSet.has(s));

  if (!needStart) {
    await createBranchDbs(dbs, versions, branchDbs);
    dispatch({ type: "SET_DOCKER", status: "done" });
    return false;
  }

  const portMap = { postgres: 5432, mysql: 3306 } as const;
  for (const svc of services) {
    const port = portMap[svc];
    // eslint-disable-next-line no-await-in-loop -- must stop conflicts sequentially
    const conflict = await execSimple("docker", [ "ps", "--filter", `publish=${port}`, "--format", "{{.Names}}" ]);
    const names = conflict.stdout.trim();
    if (names) {
      // eslint-disable-next-line no-await-in-loop
      await execSimple("docker", [ "stop", ...names.split("\n").filter(Boolean) ]);
    }
  }

  const code = await runStep([ "docker", "compose", "up", "-d", "--wait", ...services ], {}, () => {});
  if (code !== 0) {
    dispatch({ type: "SET_DOCKER", status: "failed" });
    return false;
  }

  await createBranchDbs(dbs, versions, branchDbs);
  dispatch({ type: "SET_DOCKER", status: "done" });
  return true;
}

async function createBranchDbs(
  dbs: Array<string>,
  versions: Array<string>,
  branchDbs: { v6: string; v7: string; }
): Promise<void> {
  for (const db of dbs) {
    for (const ver of versions) {
      const name = ver === "6" ? branchDbs.v6 : branchDbs.v7;
      if (db === "mysql") {
        // eslint-disable-next-line no-await-in-loop -- sequential DB creation
        await execSimple("docker", [ "compose", "exec", "-T", "mysql", "mysql", "-uroot", "-ptest", "-e", `CREATE DATABASE IF NOT EXISTS \`${name}\`;` ]);
      }
      else if (db === "pg") {
        // eslint-disable-next-line no-await-in-loop -- sequential DB creation
        await execSimple("docker", [ "compose", "exec", "-T", "postgres", "psql", "-U", "postgres", "-c", `CREATE DATABASE "${name}";` ]);
      }
    }
  }
}

async function runBuild(dispatch: Dispatch): Promise<boolean> {
  dispatch({ type: "SET_BUILD", status: "running" });
  const code = await runStep([ "pnpm", "--filter", "prisma-ts-select", "build" ], {}, () => {});
  if (code !== 0) {
    dispatch({ type: "SET_BUILD", status: "failed" });
    return false;
  }
  dispatch({ type: "SET_BUILD", status: "done" });
  return true;
}

async function runPackage(
  config: RunConfig,
  panel: PanelState,
  idx: number,
  branchDbs: { v6: string; v7: string; },
  logPath: string,
  dispatch: Dispatch
): Promise<void> {
  const { pkg, db, ver } = panel;
  const logStream = createWriteStream(logPath);
  const env: Record<string, string> = {};
  if (db === "mysql") env["DATABASE_URL"] = getDbUrl("mysql", ver, branchDbs);
  if (db === "pg") env["DATABASE_URL"] = getDbUrl("pg", ver, branchDbs);

  const onLine = (line: string): void => {
    logStream.write(line + "\n");
    dispatch({ type: "ADD_LINE", idx, line });
  };
  const setStep = (step: PanelState["step"], status: PanelState["status"]): void => {
    dispatch({ type: "SET_PANEL", idx, updates: { step, status } });
  };
  const fail = (step: PanelState["step"], code: number): void => {
    setStep(step, "failed");
    dispatch({ type: "SET_PANEL", idx, updates: { exitCode: code } });
    logStream.end();
  };

  dispatch({ type: "SET_PANEL", idx, updates: { status: "running", step: "gen" } });

  const genCode = await runStep([ "pnpm", "--filter", pkg, "gen" ], { env }, onLine);
  if (genCode !== 0) { fail("gen", genCode); return; }

  if (config.resetDb) {
    setStep("seed", "running");
    dispatch({ type: "SET_PANEL", idx, updates: { seeded: true } });
    const seedCode = await runStep([ "pnpm", "--filter", pkg, "p:r" ], { env }, onLine);
    if (seedCode !== 0) { fail("seed", seedCode); return; }
  }

  if (config.seedOnly) {
    setStep("done", "done");
    dispatch({ type: "SET_PANEL", idx, updates: { exitCode: 0 } });
    logStream.end();
    return;
  }

  if (config.testPattern) {
    setStep("test", "running");
    const testCode = await runStep(
      [ "node",
        "--import", "../../shared-tests/client-resolver.mjs",
        "--import", "../../shared-tests/test-setup.mjs",
        "--test", config.testPattern ],
      { env, cwd: `packages/${pkg}` },
      onLine
    );
    setStep("test", testCode === 0 ? "done" : "failed");
    dispatch({ type: "SET_PANEL", idx, updates: { exitCode: testCode } });
  }
  else {
    setStep("lint", "running");
    const lintCode = await runStep([ "pnpm", "--filter", pkg, "lint:ts" ], { env }, onLine);
    if (lintCode !== 0) { fail("lint", lintCode); return; }

    setStep("test", "running");
    const testCode = await runStep([ "pnpm", "--filter", pkg, "test" ], { env }, onLine);
    setStep("test", testCode === 0 ? "done" : "failed");
    dispatch({ type: "SET_PANEL", idx, updates: { exitCode: testCode } });
  }

  logStream.end();
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- orchestration is inherently branchy
export async function orchestrate(
  config: RunConfig,
  panels: Array<PanelState>,
  timestamp: string,
  dispatch: Dispatch
): Promise<void> {
  await mkdir("test-results", { recursive: true });
  const ts = timestamp;
  const branchDbs = await getBranchDbs();

  let dockerStarted = false;
  const cleanup = async (): Promise<void> => {
    if (dockerStarted) await execSimple("docker", [ "compose", "down" ]);
  };

  process.on("SIGINT", () => {
    void cleanup().then(() => process.exit(0));
  });

  dockerStarted = await runDocker(config.dbs, config.versions.map(String), branchDbs, dispatch);

  if (!config.skipBuild && !config.seedOnly) {
    const ok = await runBuild(dispatch);
    if (!ok) {
      await cleanup();
      dispatch({ type: "DONE" });
      return;
    }
  }
  else {
    dispatch({ type: "SET_BUILD", status: "skipped" });
  }

  if (config.resetDb) {
    for (const db of config.dbs) {
      if (db !== "mysql" && db !== "pg") continue;
      for (const ver of config.versions) {
        const pkg = `usage-${db}-v${ver}`;
        const env: Record<string, string> = {};
        env["DATABASE_URL"] = getDbUrl(db, ver, branchDbs);
        // eslint-disable-next-line no-await-in-loop -- sequential seed is intentional
        await runStep([ "pnpm", "--filter", pkg, "p:r" ], { env }, () => {});
      }
    }
  }

  if (config.seedOnly) {
    for (const ver of config.versions) {
      for (const db of config.dbs) {
        if (db !== "sqlite") continue;
        const pkg = `usage-${db}-v${ver}`;
        // eslint-disable-next-line no-await-in-loop -- sequential seed is intentional
        await runStep([ "pnpm", "--filter", pkg, "p:r" ], {}, () => {});
      }
    }
    dispatch({ type: "DONE" });
    await cleanup();
    return;
  }

  await Promise.all(
    panels.map(async (panel, idx) => {
      const logPath = `test-results/${ts}-${panel.db}-v${panel.ver}.log`;
      return runPackage(config, panel, idx, branchDbs, logPath, dispatch);
    })
  );

  dispatch({ type: "DONE" });
  await cleanup();
  process.removeAllListeners("SIGINT");
}
