import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'person-generator',
  name: 'Gerador de Pessoa',
  description: 'Gere dados fictícios de pessoa brasileira: nome, CPF, RG, telefone, cartão de crédito e endereço',
  category: 'generator',
  icon: 'UserRound',
  keywords: ['pessoa', 'gerador', 'nome', 'cpf', 'rg', 'endereço', 'cartão', 'crédito', 'cep', 'fake', 'dados', 'teste', 'brasil'],
  component: lazy(() => import('./index')),
}

export default meta
