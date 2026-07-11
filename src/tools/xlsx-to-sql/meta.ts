import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'xlsx-to-sql',
  name: 'XLSX → SQL',
  description: 'Gere INSERT, UPDATE ou UPSERT a partir de uma planilha Excel',
  category: 'converter',
  icon: 'Database',
  keywords: ['xlsx', 'xls', 'excel', 'planilha', 'sql', 'insert', 'update', 'upsert', 'delete', 'mysql', 'postgres', 'sqlite', 'mssql'],
  component: lazy(() => import('./index')),
}

export default meta
