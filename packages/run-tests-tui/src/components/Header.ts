import { createElement as h } from 'react'
import { Box, Text } from 'ink'
import type { GlobalState, Phase } from '../state.ts'

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'pending': return '○ pending'
    case 'running': return '↻ running'
    case 'done':    return '✓ done'
    case 'failed':  return '✗ failed'
    case 'skipped': return '— skipped'
  }
}

function phaseColor(phase: Phase): string {
  switch (phase) {
    case 'pending': return 'gray'
    case 'running': return 'cyan'
    case 'done':    return 'green'
    case 'failed':  return 'red'
    case 'skipped': return 'gray'
  }
}

export default function Header({ state }: { state: GlobalState }): ReturnType<typeof h> {
  const elapsed = ((Date.now() - state.startTime) / 1000).toFixed(1)

  return h(Box, { flexDirection: 'column', marginBottom: 1 },
    h(Box, { gap: 4 },
      h(Text, { bold: true }, 'prisma-ts-select tests'),
      h(Text, { color: 'gray' }, `${elapsed}s elapsed`),
    ),
    h(Box, { gap: 3, marginTop: 0 },
      h(Text, null,
        'Docker: ',
        h(Text, { color: phaseColor(state.docker) }, phaseLabel(state.docker)),
      ),
      h(Text, null,
        'Build:  ',
        h(Text, { color: phaseColor(state.build) }, phaseLabel(state.build)),
      ),
    ),
  )
}
