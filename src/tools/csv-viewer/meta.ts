import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'csv-viewer',
  name: 'CSV Viewer',
  description: 'Visualize arquivos CSV grandes sem travar o browser — rolagem virtual e busca em tempo real',
  category: 'formatter',
  icon: 'Table',
  keywords: ['csv', 'tabela', 'visualizar', 'viewer', 'planilha', 'dados', 'explorar'],
  component: lazy(() => import('./index')),
}

export default meta
