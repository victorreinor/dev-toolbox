import * as XLSX from 'xlsx'
import { buildJsonOutput } from './lib/jsonPreview'

interface ReadOptions {
  header: boolean
  inferTypes: boolean
  exportAll: boolean
  sheetIndex: number
}

// First read of a file: parse the workbook and build the JSON output.
interface ReadRequest {
  type: 'read'
  buffer: ArrayBuffer
  options: ReadOptions
}

// Re-run with new options without re-sending/re-unzipping the file: reuse the
// workbook cached from the last `read`.
interface RebuildRequest {
  type: 'rebuild'
  options: ReadOptions
}

interface WriteXLSXRequest {
  type: 'writeXLSX'
  data: Record<string, unknown>[]
  options: {
    sheetName: string
    flattenSeparator: string
  }
}

interface WriteCSVRequest {
  type: 'writeCSV'
  buffer: ArrayBuffer
  options: {
    sheetIndex: number
    delimiter: string
    bom: boolean
  }
}

type Request = ReadRequest | RebuildRequest | WriteXLSXRequest | WriteCSVRequest

// Workbook from the last `read`, kept so option toggles don't re-send 20MB+ over
// postMessage nor re-unzip the file.
let cachedWb: XLSX.WorkBook | null = null

function buildAndPost(wb: XLSX.WorkBook, options: ReadOptions) {
  const names = wb.SheetNames
  const parse = (name: string) =>
    XLSX.utils.sheet_to_json(wb.Sheets[name], {
      header: options.header ? undefined : 1,
      defval: '',
      raw: options.inferTypes,
    })

  let value: unknown
  let rowCount: number
  if (names.length === 1) {
    const data = parse(names[0])
    value = data
    rowCount = data.length
  } else if (options.exportAll) {
    const result: Record<string, unknown[]> = {}
    rowCount = 0
    for (const name of names) {
      const data = parse(name)
      result[name] = data
      rowCount += data.length
    }
    value = result
  } else {
    const data = parse(names[options.sheetIndex] ?? names[0])
    value = data
    rowCount = data.length
  }

  const out = buildJsonOutput(value)
  self.postMessage({ ok: true, ...out, sheetNames: names, rowCount })
}

self.onmessage = (e: MessageEvent<Request>) => {
  const req = e.data

  if (req.type === 'read') {
    try {
      cachedWb = XLSX.read(req.buffer, { type: 'array' })
      buildAndPost(cachedWb, req.options)
    } catch (err) {
      self.postMessage({ ok: false, error: String(err) })
    }
  }

  if (req.type === 'rebuild') {
    try {
      if (!cachedWb) { self.postMessage({ ok: false, error: 'Nenhuma planilha carregada' }); return }
      buildAndPost(cachedWb, req.options)
    } catch (err) {
      self.postMessage({ ok: false, error: String(err) })
    }
  }

  if (req.type === 'writeXLSX') {
    try {
      const flatData = req.data.map(row => flattenObject(row, req.options.flattenSeparator))
      const ws = XLSX.utils.json_to_sheet(flatData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, req.options.sheetName || 'Sheet1')
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
      self.postMessage({ ok: true, buffer: buf })
    } catch (err) {
      self.postMessage({ ok: false, error: String(err) })
    }
  }

  if (req.type === 'writeCSV') {
    try {
      const wb = XLSX.read(req.buffer, { type: 'array' })
      const sheetNames = wb.SheetNames
      const sheetName = sheetNames[req.options.sheetIndex] || sheetNames[0]
      const ws = wb.Sheets[sheetName]

      let csv = XLSX.utils.sheet_to_csv(ws, { FS: req.options.delimiter || ',' })
      if (req.options.bom) csv = '\uFEFF' + csv
      self.postMessage({ ok: true, csv })
    } catch (err) {
      self.postMessage({ ok: false, error: String(err) })
    }
  }
}

const MAX_FLATTEN_DEPTH = 5

function flattenObject(
  obj: Record<string, unknown>,
  sep: string,
  prefix = '',
  depth = 0
): Record<string, unknown> {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, val]) => {
    const path = prefix ? `${prefix}${sep}${key}` : key
    if (depth < MAX_FLATTEN_DEPTH && val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flattenObject(val as Record<string, unknown>, sep, path, depth + 1))
    } else {
      acc[path] = val
    }
    return acc
  }, {})
}
