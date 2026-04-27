import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'string-size',
  name: 'Tamanho de Payload',
  description: 'Meça o tamanho em bytes de qualquer string ou JSON e compare com os limites do SQS, Lambda e outros serviços',
  category: 'validator',
  icon: 'Weight',
  keywords: [
    'tamanho', 'size', 'peso', 'bytes', 'kb', 'mb', 'payload', 'json',
    'sqs', 'lambda', 'sns', 'eventbridge', 'api gateway', 'limite', 'limit',
    'string', 'text', 'medir', 'measure', 'aws',
  ],
  component: lazy(() => import('./index')),
}

export default meta
