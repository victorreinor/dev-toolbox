import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'markdown-preview',
  name: 'Markdown Preview',
  description: 'Edite e visualize markdown em tempo real',
  category: 'formatter',
  icon: 'FileText',
  keywords: ['markdown', 'md', 'preview', 'visualizador', 'editor', 'texto', 'render'],
  component: lazy(() => import('./index')),
}

export default meta
