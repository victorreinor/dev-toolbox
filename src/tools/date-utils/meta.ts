import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'date-utils',
  name: 'Utilitários de Data',
  description: 'Diferença, calculadora, timestamp e formatação de datas',
  category: 'formatter',
  icon: 'Calendar',
  keywords: ['data', 'date', 'timestamp', 'unix', 'diferença', 'calculadora', 'formato', 'tempo'],
  component: lazy(() => import('./index')),
}

export default meta
