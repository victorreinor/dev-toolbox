import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'json-to-xlsx',
  name: 'JSON → XLSX',
  description: 'Converta JSON para planilha Excel (.xlsx)',
  category: 'converter',
  icon: 'Sheet',
  keywords: ['json', 'xlsx', 'excel', 'planilha', 'converter'],
  component: lazy(() => import('./index')),
}

export default meta
