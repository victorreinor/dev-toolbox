import type { ToolMeta } from './types'
import jsonToXlsx from './tools/json-to-xlsx/meta'
import jsonToCsv from './tools/json-to-csv/meta'
import csvToJson from './tools/csv-to-json/meta'
import xlsxToJson from './tools/xlsx-to-json/meta'
import xlsxToCsv from './tools/xlsx-to-csv/meta'
import csvToXlsx from './tools/csv-to-xlsx/meta'
import jsonToSql from './tools/json-to-sql/meta'
import cpfGenerator from './tools/cpf-generator/meta'
import cnpjGenerator from './tools/cnpj-generator/meta'
import jsonToJsObject from './tools/json-to-js-object/meta'
import markdownPreview from './tools/markdown-preview/meta'
import uuidGenerator from './tools/uuid-generator/meta'
import passwordGenerator from './tools/password-generator/meta'
import dateUtils from './tools/date-utils/meta'

export const registry: ToolMeta[] = [
  markdownPreview,
  uuidGenerator,
  passwordGenerator,
  dateUtils,
  jsonToXlsx,
  jsonToCsv,
  csvToJson,
  csvToXlsx,
  xlsxToJson,
  xlsxToCsv,
  jsonToSql,
  cpfGenerator,
  cnpjGenerator,
  jsonToJsObject,
]

export function getToolById(id: string): ToolMeta | undefined {
  return registry.find(t => t.id === id)
}

export function searchTools(query: string): ToolMeta[] {
  const q = query.toLowerCase().trim()
  if (!q) return registry
  return registry.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.keywords.some(k => k.toLowerCase().includes(q))
  )
}
