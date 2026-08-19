import type { RunConfig } from "./cli.ts";
import { makeTimestamp, orchestrate } from "./runner.ts";
import type { Action } from "./state.ts";
import { makeInitialState } from "./state.ts";

type Result = {
  pkg: string;
  db: string;
  ver: string;
  status: "pass" | "fail";
  exitCode: number | null;
  logFile: string;
};

export async function runCi(config: RunConfig): Promise<void> {
  const pairs = config.versions.flatMap(ver =>
    config.dbs.map(db => ({ db, ver }))
  );
  const initial = makeInitialState(pairs);
  const panels = initial.panels;
  const results: Array<Result> = [];

  let resolveDone: () => void;
  const donePromise = new Promise<void>(resolve => { resolveDone = resolve; });

  const dispatch = (action: Action): void => {
    if (action.type === "SET_PANEL") {
      const p = panels[action.idx];
      Object.assign(p, action.updates);
    }
    if (action.type === "DONE") resolveDone();
  };

  const ts = makeTimestamp();
  await orchestrate(config, panels, ts, dispatch);
  await donePromise;

  for (const p of panels) {
    results.push({
      pkg: p.pkg,
      db: p.db,
      ver: p.ver,
      status: p.exitCode === 0 ? "pass" : "fail",
      exitCode: p.exitCode,
      logFile: `test-results/${ts}-${p.db}-v${p.ver}.log`,
    });
  }

  process.stdout.write(JSON.stringify(results, null, 2) + "\n");
  const failed = results.some(r => r.status === "fail");
  process.exitCode = failed ? 1 : 0;
}
