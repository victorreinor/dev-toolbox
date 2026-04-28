import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'json-diff',
  name: 'JSON Diff',
  description: 'Compare dois JSONs e visualize as diferenças linha a linha',
  category: 'formatter',
  icon: 'GitCompare',
  keywords: ['json', 'diff', 'compare', 'diferença', 'comparar', 'changes'],
  component: lazy(() => import('./index')),
}

export default meta
