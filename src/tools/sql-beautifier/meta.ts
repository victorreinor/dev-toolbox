import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'sql-beautifier',
  name: 'SQL Beautifier',
  description: 'Formate e embeleze queries SQL com suporte a múltiplos dialetos',
  category: 'formatter',
  icon: 'Database',
  keywords: ['sql', 'beautifier', 'formatter', 'format', 'query', 'postgres', 'mysql', 'sqlite', 'prettier', 'indent'],
  component: lazy(() => import('./index')),
}

export default meta
