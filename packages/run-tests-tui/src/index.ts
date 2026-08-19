import { parseArgs } from "./cli.ts";

const config = parseArgs();

if (config.ci) {
  const { runCi } = await import("./ci.ts");
  await runCi(config);
}
else {
  const { render } = await import("ink");
  const { createElement: h } = await import("react");
  const { default: App } = await import("./components/App.ts");
  render(h(App, { config }));
}
