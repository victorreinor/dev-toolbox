import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'cnpj-generator',
  name: 'Gerador de CNPJ',
  description: 'Gere CNPJs válidos para testes',
  category: 'generator',
  icon: 'Building2',
  keywords: ['cnpj', 'gerador', 'brasil', 'empresa', 'teste', 'dados'],
  component: lazy(() => import('./index')),
}

export default meta
