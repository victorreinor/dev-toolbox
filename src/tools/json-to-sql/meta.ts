import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'json-to-sql',
  name: 'JSON → SQL',
  description: 'Gere INSERT, UPDATE ou UPSERT a partir de JSON',
  category: 'converter',
  icon: 'Database',
  keywords: ['json', 'sql', 'insert', 'update', 'upsert', 'mysql', 'postgres', 'sqlite'],
  component: lazy(() => import('./index')),
}

export default meta
