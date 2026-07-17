export type Phase = 'pending' | 'running' | 'done' | 'failed' | 'skipped'
export type Step = 'gen' | 'seed' | 'lint' | 'test'

export type PanelState = {
  pkg: string
  db: 'sqlite' | 'mysql' | 'pg'
  ver: '6' | '7'
  step: Step | 'done'
  status: Phase
  lines: string[]
  startedAt: number
  elapsed: number
  exitCode: number | null
  seeded: boolean
}

export type GlobalState = {
  docker: Phase
  build: Phase
  panels: PanelState[]
  done: boolean
  startTime: number
}

export type Action =
  | { type: 'SET_DOCKER'; status: Phase }
  | { type: 'SET_BUILD'; status: Phase }
  | { type: 'SET_PANEL'; idx: number; updates: Partial<PanelState> }
  | { type: 'ADD_LINE'; idx: number; line: string }
  | { type: 'TICK' }
  | { type: 'DONE' }

const MAX_LINES = 8

export function reducer(state: GlobalState, action: Action): GlobalState {
  switch (action.type) {
    case 'SET_DOCKER':
      return { ...state, docker: action.status }
    case 'SET_BUILD':
      return { ...state, build: action.status }
    case 'SET_PANEL': {
      const panels = [...state.panels]
      const existing = panels[action.idx]!
      const updates = { ...action.updates } as Partial<PanelState>
      if (updates.status === 'running' && existing.status !== 'running') {
        updates.startedAt = Date.now()
      }
      panels[action.idx] = { ...existing, ...updates }
      return { ...state, panels }
    }
    case 'ADD_LINE': {
      const panels = [...state.panels]
      const panel = panels[action.idx]!
      const lines = [...panel.lines, action.line].slice(-MAX_LINES)
      panels[action.idx] = { ...panel, lines }
      return { ...state, panels }
    }
    case 'TICK': {
      const now = Date.now()
      const panels = state.panels.map(p =>
        p.status === 'running' && p.startedAt > 0
          ? { ...p, elapsed: now - p.startedAt }
          : p
      )
      return { ...state, panels }
    }
    case 'DONE':
      return { ...state, done: true }
    default:
      return state
  }
}

export function makeInitialState(
  pairs: Array<{ db: PanelState['db']; ver: PanelState['ver'] }>
): GlobalState {
  return {
    docker: 'pending',
    build: 'pending',
    panels: pairs.map(({ db, ver }) => ({
      pkg: `usage-${db}-v${ver}`,
      db,
      ver,
      step: 'gen',
      status: 'pending',
      lines: [],
      startedAt: 0,
      elapsed: 0,
      exitCode: null,
      seeded: false,
    })),
    done: false,
    startTime: Date.now(),
  }
}
