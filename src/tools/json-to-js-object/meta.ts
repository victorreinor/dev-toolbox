import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'json-to-js-object',
  name: 'JSON → JS Object',
  description: 'Converta JSON para objeto literal JavaScript',
  category: 'converter',
  icon: 'Braces',
  keywords: ['json', 'javascript', 'object', 'converter', 'js'],
  component: lazy(() => import('./index')),
}

export default meta
