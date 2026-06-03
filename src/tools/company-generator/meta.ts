import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'company-generator',
  name: 'Gerador de Empresa',
  description: 'Gere dados fictícios de empresa brasileira: CNPJ, razão social, endereço, inscrição estadual e mais',
  category: 'generator',
  icon: 'Building2',
  keywords: ['empresa', 'gerador', 'cnpj', 'razão social', 'nome fantasia', 'endereço', 'cep', 'fake', 'dados', 'teste', 'brasil', 'pj'],
  component: lazy(() => import('./index')),
}

export default meta
