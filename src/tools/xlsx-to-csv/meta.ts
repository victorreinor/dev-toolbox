import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'xlsx-to-csv',
  name: 'XLSX → CSV',
  description: 'Converta planilha Excel para CSV',
  category: 'converter',
  icon: 'FileSpreadsheet',
  keywords: ['xlsx', 'excel', 'csv', 'planilha', 'converter'],
  component: lazy(() => import('./index')),
}

export default meta
