import { Box, useApp } from "ink";
import { createElement as h, useReducer, useEffect, useRef, useState } from "react";
import type { RunConfig } from "../cli.ts";
import { orchestrate, makeTimestamp } from "../runner.ts";
import { reducer, makeInitialState } from "../state.ts";
import Header from "./Header.ts";
import PanelGrid from "./PanelGrid.ts";
import Summary from "./Summary.ts";

export default function App({ config }: { config: RunConfig; }): ReturnType<typeof h> {
  const pairs = config.versions.flatMap(ver =>
    config.dbs.map(db => ({ db, ver }))
  );

  const [ state, dispatch ] = useReducer(reducer, makeInitialState(pairs));
  const { exit } = useApp();
  const startedRef = useRef(false);
  const initialPanelsRef = useRef(state.panels);
  const [ timestamp ] = useState(() => makeTimestamp());

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const timer = setInterval(() => dispatch({ type: "TICK" }), 200);

    orchestrate(config, initialPanelsRef.current, timestamp, dispatch).then(() => {
      clearInterval(timer);
      return null;
    })
      .catch(() => {
        clearInterval(timer);
        dispatch({ type: "DONE" });
      });

    return () => clearInterval(timer);
  }, [ config, timestamp ]);

  useEffect(() => {
    if (!state.done) return () => {};
    const t = setTimeout(() => exit(), 150);
    return () => clearTimeout(t);
  }, [ state.done, exit ]);

  return h(Box, { flexDirection: "column", padding: 1 },
    h(Header, { state }),
    state.done
      ? h(Summary, { panels: state.panels, timestamp })
      : h(PanelGrid, { panels: state.panels })
  );
}
