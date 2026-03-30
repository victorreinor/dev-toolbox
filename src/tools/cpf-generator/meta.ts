import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'cpf-generator',
  name: 'Gerador de CPF',
  description: 'Gere CPFs válidos para testes',
  category: 'generator',
  icon: 'IdCard',
  keywords: ['cpf', 'gerador', 'brasil', 'documento', 'teste', 'dados'],
  component: lazy(() => import('./index')),
}

export default meta
