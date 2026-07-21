import { Box } from "ink";
import { createElement as h } from "react";
import type { PanelState } from "../state.ts";
import Panel from "./Panel.ts";

export default function PanelGrid({ panels }: { panels: Array<PanelState>; }): ReturnType<typeof h> {
  return h(Box, { flexWrap: "wrap", flexDirection: "row" },
    ...panels.map(panel =>
      h(Panel, { key: panel.pkg, state: panel })
    )
  );
}
