import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'password-generator',
  name: 'Gerador de Senha',
  description: 'Gere senhas fortes e personalizáveis',
  category: 'generator',
  icon: 'Shield',
  keywords: ['senha', 'password', 'gerador', 'segurança', 'forte', 'aleatório', 'crypto'],
  component: lazy(() => import('./index')),
}

export default meta
