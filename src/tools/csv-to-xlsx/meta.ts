import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'csv-to-xlsx',
  name: 'CSV → XLSX',
  description: 'Converta arquivos CSV para planilha Excel',
  category: 'converter',
  icon: 'FileSpreadsheet',
  keywords: ['csv', 'xlsx', 'excel', 'planilha', 'converter', 'spreadsheet'],
  component: lazy(() => import('./index')),
}

export default meta
