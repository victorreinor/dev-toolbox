import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'uuid-generator',
  name: 'UUID Generator',
  description: 'Gere UUIDs em todas as versões (v1, v4, v5, v7)',
  category: 'generator',
  icon: 'Hash',
  keywords: ['uuid', 'guid', 'gerador', 'v1', 'v4', 'v5', 'v7', 'único', 'id'],
  component: lazy(() => import('./index')),
}

export default meta
