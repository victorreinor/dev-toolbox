import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'csv-to-json',
  name: 'CSV → JSON',
  description: 'Converta CSV para JSON com detecção automática de separador',
  category: 'converter',
  icon: 'Braces',
  keywords: ['csv', 'json', 'converter', 'parse', 'tabela'],
  component: lazy(() => import('./index')),
}

export default meta
