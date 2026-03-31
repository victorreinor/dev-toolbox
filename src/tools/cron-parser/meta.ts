import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'cron-parser',
  name: 'Cron Parser',
  description: 'Interpreta e constrói expressões cron — suporta formato padrão e AWS (cron(...))',
  category: 'formatter',
  icon: 'Clock',
  keywords: ['cron', 'schedule', 'agendamento', 'aws', 'expressão', 'crontab', 'rate', 'periodicidade', 'tempo'],
  component: lazy(() => import('./index')),
}

export default meta
