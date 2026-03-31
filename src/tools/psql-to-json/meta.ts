import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'psql-to-json',
  name: 'psql → JSON',
  description: 'Converta saída do terminal PostgreSQL para JSON (modo tabular e expandido)',
  category: 'converter',
  icon: 'Database',
  keywords: ['postgresql', 'psql', 'json', 'sql', 'terminal', 'bastion', 'tabela', 'converter', 'banco'],
  component: lazy(() => import('./index')),
}

export default meta
