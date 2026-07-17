import { createElement as h } from 'react'
import { Box, Text } from 'ink'
import type { PanelState, Phase, Step } from '../state.ts'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

function spinnerFrame(elapsed: number): string {
  return SPINNER_FRAMES[Math.floor(elapsed / 100) % SPINNER_FRAMES.length] ?? '⠋'
}

function statusIcon(status: Phase, elapsed: number): string {
  switch (status) {
    case 'pending': return '○'
    case 'running': return spinnerFrame(elapsed)
    case 'done':    return '✓'
    case 'failed':  return '✗'
    case 'skipped': return '—'
  }
}

function statusColor(status: Phase): string {
  switch (status) {
    case 'pending': return 'gray'
    case 'running': return 'cyan'
    case 'done':    return 'green'
    case 'failed':  return 'red'
    case 'skipped': return 'gray'
  }
}

const STEPS: Step[] = ['gen', 'seed', 'lint', 'test']

function resolveStepStatus(panel: PanelState, step: Step): Phase {
  const stepIdx = STEPS.indexOf(step)
  const curIdx = panel.step === 'done' ? STEPS.length : (STEPS.indexOf(panel.step as Step) ?? 0)

  if (stepIdx < curIdx) {
    // Already passed this step — done or failed?
    // If overall status is failed and this is the current step, it's failed
    return 'done'
  }
  if (stepIdx === curIdx) {
    return panel.status === 'pending' ? 'pending' : panel.status
  }
  return panel.status === 'failed' ? 'skipped' : 'pending'
}

export default function Panel({ state }: { state: PanelState }): ReturnType<typeof h> {
  const elapsedSec = (state.elapsed / 1000).toFixed(1)

  const visibleSteps = STEPS.filter(s => s !== 'seed' || state.seeded)

  const title = `${state.pkg}  ${statusIcon(state.status, state.elapsed)} ${state.step}${state.status === 'running' ? `  ${elapsedSec}s` : ''}`

  return h(Box, {
    borderStyle: 'round',
    borderColor: statusColor(state.status),
    flexDirection: 'column',
    width: '50%',
    paddingX: 1,
    minHeight: 6,
  },
    h(Text, { bold: true, color: statusColor(state.status), wrap: 'truncate' }, title),
    h(Box, { flexDirection: 'row', gap: 2, marginTop: 0 },
      ...visibleSteps.map(step => {
        const st = resolveStepStatus(state, step)
        return h(Text, { key: step, color: statusColor(st) },
          `${statusIcon(st, state.elapsed)} ${step}`,
        )
      }),
    ),
    ...state.lines.map((line, i) =>
      h(Text, { key: i, color: 'gray', dimColor: true, wrap: 'truncate' }, `  ${line}`),
    ),
  )
}
