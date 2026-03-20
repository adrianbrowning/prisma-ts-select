import { createElement as h } from 'react'
import { render } from 'ink'
import { parseArgs } from './cli.ts'
import App from './components/App.ts'

const config = parseArgs()
render(h(App, { config }))
