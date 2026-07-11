import type { ToolMeta } from './types'
import psqlToJson from './tools/psql-to-json/meta'
import jsonToXlsx from './tools/json-to-xlsx/meta'
import jsonToCsv from './tools/json-to-csv/meta'
import csvToJson from './tools/csv-to-json/meta'
import xlsxToJson from './tools/xlsx-to-json/meta'
import xlsxToCsv from './tools/xlsx-to-csv/meta'
import csvToXlsx from './tools/csv-to-xlsx/meta'
import jsonToSql from './tools/json-to-sql/meta'
import xlsxToSql from './tools/xlsx-to-sql/meta'
import cpfGenerator from './tools/cpf-generator/meta'
import cnpjGenerator from './tools/cnpj-generator/meta'
import personGenerator from './tools/person-generator/meta'
import companyGenerator from './tools/company-generator/meta'
import jsonToJsObject from './tools/json-to-js-object/meta'
import markdownPreview from './tools/markdown-preview/meta'
import uuidGenerator from './tools/uuid-generator/meta'
import passwordGenerator from './tools/password-generator/meta'
import dateUtils from './tools/date-utils/meta'
import dedupLines from './tools/dedup-lines/meta'
import cronParser from './tools/cron-parser/meta'
import base64 from './tools/base64/meta'
import csvViewer from './tools/csv-viewer/meta'
import stringSize from './tools/string-size/meta'
import jsonDiff from './tools/json-diff/meta'
import sqlBeautifier from './tools/sql-beautifier/meta'
import textToFile from './tools/text-to-file/meta'

export const registry: ToolMeta[] = [
  textToFile,
  psqlToJson,
  jsonDiff,
  sqlBeautifier,
  cronParser,
  base64,
  csvViewer,
  stringSize,
  dedupLines,
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
  xlsxToSql,
  cpfGenerator,
  cnpjGenerator,
  personGenerator,
  companyGenerator,
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
