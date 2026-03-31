import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'dedup-lines',
  name: 'Remover Duplicatas',
  description: 'Remove linhas duplicadas de um texto, mantendo a primeira ocorrência',
  category: 'formatter',
  icon: 'ListFilter',
  keywords: ['duplicata', 'duplicado', 'linhas', 'unique', 'dedup', 'remover', 'filtrar', 'texto', 'sort'],
  component: lazy(() => import('./index')),
}

export default meta
