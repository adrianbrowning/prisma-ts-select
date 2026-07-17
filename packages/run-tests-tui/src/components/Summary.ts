import { createElement as h } from 'react'
import { Box, Text } from 'ink'
import type { PanelState } from '../state.ts'

export default function Summary({ panels, timestamp }: { panels: PanelState[]; timestamp: string }): ReturnType<typeof h> {
  const allPassed = panels.every(p => p.exitCode === 0)

  return h(Box, { flexDirection: 'column', marginTop: 1 },
    h(Text, { bold: true }, 'Results:'),
    h(Box, { flexDirection: 'column', marginTop: 0 },
      ...panels.map(panel => {
        const passed = panel.exitCode === 0
        const status = passed ? '✓ pass' : '✗ fail'
        const color = passed ? 'green' : 'red'
        const logPath = `test-results/${timestamp}-${panel.db}-v${panel.ver}.log`
        return h(Box, { key: panel.pkg },
          h(Text, null,
            h(Text, { color: 'white' }, panel.db.padEnd(8)),
            ' | ',
            h(Text, { color: 'white' }, `v${panel.ver}`.padEnd(3)),
            ' | ',
            h(Text, { color }, status),
            ' | ',
            h(Text, { color: 'gray' }, logPath),
          ),
        )
      }),
    ),
    h(Box, { marginTop: 1 },
      allPassed
        ? h(Text, { color: 'green', bold: true }, 'All tests passed ✓')
        : h(Text, { color: 'red', bold: true }, 'Some tests failed ✗'),
    ),
  )
}
