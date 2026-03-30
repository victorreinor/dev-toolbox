import * as XLSX from 'xlsx'

interface ReadRequest {
  type: 'read'
  buffer: ArrayBuffer
  options: {
    sheetIndex: number
    header: boolean
    inferTypes: boolean
  }
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

type Request = ReadRequest | WriteXLSXRequest | WriteCSVRequest

self.onmessage = (e: MessageEvent<Request>) => {
  const req = e.data

  if (req.type === 'read') {
    try {
      const wb = XLSX.read(req.buffer, { type: 'array' })
      const sheetNames = wb.SheetNames
      const sheetName = sheetNames[req.options.sheetIndex] || sheetNames[0]
      const ws = wb.Sheets[sheetName]

      const data = XLSX.utils.sheet_to_json(ws, {
        header: req.options.header ? undefined : 1,
        defval: '',
        raw: req.options.inferTypes,
      })

      self.postMessage({ ok: true, data, sheetNames })
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
