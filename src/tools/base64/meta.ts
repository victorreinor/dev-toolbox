import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'base64',
  name: 'Base64',
  description: 'Codifique arquivos e imagens em Base64 ou decodifique strings Base64 de volta ao arquivo original',
  category: 'converter',
  icon: 'FileCode2',
  keywords: ['base64', 'encode', 'decode', 'imagem', 'image', 'arquivo', 'file', 'converter', 'codificar', 'decodificar', 'data url'],
  component: lazy(() => import('./index')),
}

export default meta
