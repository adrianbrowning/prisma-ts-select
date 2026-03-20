import { createElement as h } from 'react'
import { Box } from 'ink'
import Panel from './Panel.ts'
import type { PanelState } from '../state.ts'

export default function PanelGrid({ panels }: { panels: PanelState[] }): ReturnType<typeof h> {
  return h(Box, { flexWrap: 'wrap', flexDirection: 'row' },
    ...panels.map(panel =>
      h(Panel, { key: panel.pkg, state: panel }),
    ),
  )
}
