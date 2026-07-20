import { render } from "ink";
import { createElement as h } from "react";
import { parseArgs } from "./cli.ts";
import App from "./components/App.ts";

const config = parseArgs();
render(h(App, { config }));
