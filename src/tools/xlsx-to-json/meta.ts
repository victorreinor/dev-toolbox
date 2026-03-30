import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'xlsx-to-json',
  name: 'XLSX → JSON',
  description: 'Converta planilha Excel para JSON',
  category: 'converter',
  icon: 'Table',
  keywords: ['xlsx', 'excel', 'json', 'planilha', 'converter'],
  component: lazy(() => import('./index')),
}

export default meta
