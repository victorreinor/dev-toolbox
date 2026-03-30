import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'json-to-csv',
  name: 'JSON → CSV',
  description: 'Converta JSON para formato CSV',
  category: 'converter',
  icon: 'FileText',
  keywords: ['json', 'csv', 'converter', 'comma', 'separated'],
  component: lazy(() => import('./index')),
}

export default meta
