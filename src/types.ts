import { lazy } from 'react'

export type ToolCategory = 'converter' | 'generator' | 'formatter' | 'validator'

export interface ToolMeta {
  id: string
  name: string
  description: string
  category: ToolCategory
  icon: string
  keywords: string[]
  component: ReturnType<typeof lazy>
}
