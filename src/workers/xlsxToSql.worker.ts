import * as XLSX from 'xlsx'
import { buildTextOutput } from './lib/textOutput'
import {
  generateSQL,
  generateCreateTable,
  wrapInTransaction,
  operationNeedsKey,
  type ColumnType,
  type SqlDialect,
  type SqlOperation,
} from '../utils/sqlGenerator'

export interface ColumnConfig {
  /** Column name as read from the sheet. */
  source: string
  /** Column name to emit in the SQL (rename). */
  name: string
  type: ColumnType
}

export interface GenerateOptions {
  sheetIndex: number
  header: boolean
  columns: ColumnConfig[]
  table: string
  dialect: SqlDialect
  operation: SqlOperation
  keyFields: string[]
  batchSize: number
  emptyAsNull: boolean
  createTable: boolean
  transaction: boolean
}

// First read of a file: parse the workbook and describe the first sheet.
interface ReadRequest {
  type: 'read'
  buffer: ArrayBuffer
  header: boolean
}

// Describe another sheet (or the same one with the header toggle flipped) without
// re-sending/re-unzipping the file: reuse the workbook cached from the last `read`.
interface InspectRequest {
  type: 'inspect'
  sheetIndex: number
  header: boolean
}

interface GenerateRequest {
  type: 'generate'
  options: GenerateOptions
}

type Request = ReadRequest | InspectRequest | GenerateRequest

let cachedWb: XLSX.WorkBook | null = null

const SAMPLE_ROWS = 5

interface Sheet {
  columns: string[]
  rows: unknown[][]
}

// `sheet_to_json` re-materializes the whole grid, so cache the last parse: both
// the preview and each generate (option tweaks that don't touch the grid) reuse it.
let cachedSheet: { key: string; sheet: Sheet } | null = null

function getSheet(wb: XLSX.WorkBook, sheetIndex: number, header: boolean): Sheet {
  const key = `${sheetIndex}:${header}`
  if (cachedSheet?.key === key) return cachedSheet.sheet
  const sheet = readSheet(wb, sheetIndex, header)
  cachedSheet = { key, sheet }
  return sheet
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDate(value: Date): string {
  // SheetJS's Excel-serial → Date conversion lands a millisecond short of the true
  // instant (2023-01-15 arrives as 2023-01-14T23:59:59.999), so snap to the nearest
  // second before reading the fields. Excel has no sub-second precision anyway.
  const d = new Date(Math.round(value.getTime() / 1000) * 1000)
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const hasTime = d.getHours() || d.getMinutes() || d.getSeconds()
  return hasTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : date
}

/** Header cells can be empty or repeated; SQL column names cannot. */
function buildColumnNames(headerRow: unknown[], width: number): string[] {
  const seen = new Map<string, number>()
  return Array.from({ length: width }, (_, i) => {
    const raw = String(headerRow[i] ?? '').trim()
    const base = raw || `column_${i + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })
}

function readSheet(wb: XLSX.WorkBook, sheetIndex: number, header: boolean): Sheet {
  const name = wb.SheetNames[sheetIndex] ?? wb.SheetNames[0]
  const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
    header: 1,
    defval: '',
    blankrows: false,
    raw: true,
  })
  if (grid.length === 0) return { columns: [], rows: [] }

  const width = grid.reduce((max, row) => Math.max(max, row.length), 0)
  return {
    columns: buildColumnNames(header ? grid[0] : [], width),
    rows: header ? grid.slice(1) : grid,
  }
}

const TRUE_WORDS = new Set(['true', '1', 'y', 't', 'yes', 'sim', 'verdadeiro'])
const FALSE_WORDS = new Set(['false', '0', 'n', 'f', 'no', 'nao', 'não', 'falso'])

function coerce(val: unknown, type: ColumnType, emptyAsNull: boolean): unknown {
  if (val instanceof Date) {
    return type === 'number' ? val.getTime() : formatDate(val)
  }
  if (val === null || val === undefined) return null
  if (typeof val === 'string' && val.trim() === '') return emptyAsNull ? null : ''

  switch (type) {
    case 'auto':
      return val
    case 'text':
      return String(val)
    case 'number': {
      // Accept the pt-BR "1.234,56" shape as well as plain "1234.56".
      const n = typeof val === 'number'
        ? val
        : Number(String(val).trim().replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))
      return Number.isFinite(n) ? n : null
    }
    case 'boolean': {
      if (typeof val === 'boolean') return val
      if (typeof val === 'number') return val !== 0
      const s = String(val).trim().toLowerCase()
      if (TRUE_WORDS.has(s)) return true
      if (FALSE_WORDS.has(s)) return false
      return null
    }
    case 'date':
      return String(val).trim()
  }
}

function postSheet(wb: XLSX.WorkBook, sheetIndex: number, header: boolean) {
  const { columns, rows } = getSheet(wb, sheetIndex, header)
  const sampleRows = rows.slice(0, SAMPLE_ROWS).map(row =>
    columns.map((_, i) => {
      const cell = row[i]
      if (cell instanceof Date) return formatDate(cell)
      return cell === null || cell === undefined ? '' : String(cell)
    })
  )

  self.postMessage({
    ok: true,
    kind: 'sheet',
    sheetNames: wb.SheetNames,
    sheetIndex,
    sheetName: wb.SheetNames[sheetIndex] ?? wb.SheetNames[0],
    columns,
    sampleRows,
    rowCount: rows.length,
  })
}

function postSql(wb: XLSX.WorkBook, options: GenerateOptions) {
  const { columns, rows } = getSheet(wb, options.sheetIndex, options.header)

  const selected = options.columns.filter(c => columns.includes(c.source))
  if (selected.length === 0) {
    self.postMessage({ ok: false, error: 'Selecione ao menos uma coluna' })
    return
  }
  if (rows.length === 0) {
    self.postMessage({ ok: false, error: 'A planilha não tem linhas de dados' })
    return
  }

  const indexOf = new Map(columns.map((name, i) => [name, i]))
  const data = rows.map(row => {
    const out: Record<string, unknown> = {}
    for (const col of selected) {
      out[col.name] = coerce(row[indexOf.get(col.source)!], col.type, options.emptyAsNull)
    }
    return out
  })

  const outputNames = selected.map(c => c.name)
  const keyFields = options.keyFields.filter(k => outputNames.includes(k))
  if (operationNeedsKey(options.operation) && keyFields.length === 0) {
    self.postMessage({ ok: false, error: 'Selecione o(s) campo(s) chave' })
    return
  }

  const dml = generateSQL(data, {
    table: options.table,
    operation: options.operation,
    dialect: options.dialect,
    keyFields,
    batchSize: options.batchSize,
  })

  const parts: string[] = []
  if (options.createTable) {
    const types = Object.fromEntries(selected.map(c => [c.name, c.type]))
    parts.push(generateCreateTable(data, {
      table: options.table,
      dialect: options.dialect,
      keyFields,
      types,
    }))
  }
  parts.push(options.transaction ? wrapInTransaction(dml, options.dialect) : dml)

  const out = buildTextOutput(parts.join('\n\n'), 'text/plain')
  self.postMessage({ ok: true, kind: 'sql', ...out, rowCount: data.length })
}

self.onmessage = (e: MessageEvent<Request>) => {
  const req = e.data

  try {
    if (req.type === 'read') {
      cachedWb = XLSX.read(req.buffer, { type: 'array', cellDates: true })
      cachedSheet = null
      if (cachedWb.SheetNames.length === 0) {
        self.postMessage({ ok: false, error: 'Planilha vazia' })
        return
      }
      postSheet(cachedWb, 0, req.header)
      return
    }

    if (!cachedWb) {
      self.postMessage({ ok: false, error: 'Nenhuma planilha carregada' })
      return
    }

    if (req.type === 'inspect') postSheet(cachedWb, req.sheetIndex, req.header)
    if (req.type === 'generate') postSql(cachedWb, req.options)
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) })
  }
}
