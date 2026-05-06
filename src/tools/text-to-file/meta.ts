import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'text-to-file',
  name: 'Texto → Arquivo',
  description: 'Cole um texto e baixe como arquivo com a extensão que quiser',
  category: 'formatter',
  icon: 'FileDown',
  keywords: ['texto', 'arquivo', 'download', 'txt', 'salvar', 'exportar', 'colar', 'clipboard', 'file', 'save'],
  component: lazy(() => import('./index')),
}

export default meta
