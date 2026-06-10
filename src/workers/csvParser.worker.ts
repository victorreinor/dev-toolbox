import Papa from 'papaparse'
import { buildJsonOutput } from './lib/jsonPreview'

interface ParseRequest {
  type: 'parse'
  text: string
  options: {
    header: boolean
    inferTypes: boolean
    delimiter: string
  }
}

// Like `parse`, but stringifies to JSON inside the worker and returns a Blob +
// preview instead of the parsed array — keeps a file-scale JSON string off the
// main thread.
interface ParseToJsonRequest {
  type: 'parseToJson'
  text: string
  options: {
    header: boolean
    inferTypes: boolean
    delimiter: string
  }
}

interface ConvertRequest {
  type: 'toCSV'
  data: Record<string, unknown>[]
  options: {
    delimiter: string
    includeHeader: boolean
    bom: boolean
  }
}

type Request = ParseRequest | ParseToJsonRequest | ConvertRequest

self.onmessage = (e: MessageEvent<Request>) => {
  const req = e.data

  if (req.type === 'parse') {
    try {
      const result = Papa.parse(req.text, {
        header: req.options.header,
        delimiter: req.options.delimiter || undefined,
        dynamicTyping: req.options.inferTypes,
        skipEmptyLines: true,
      })

      self.postMessage({ ok: true, data: result.data, meta: result.meta })
    } catch (err) {
      self.postMessage({ ok: false, error: String(err) })
    }
  }

  if (req.type === 'parseToJson') {
    try {
      const result = Papa.parse(req.text, {
        header: req.options.header,
        delimiter: req.options.delimiter || undefined,
        dynamicTyping: req.options.inferTypes,
        skipEmptyLines: true,
      })

      const out = buildJsonOutput(result.data)
      self.postMessage({ ok: true, ...out, rowCount: result.data.length })
    } catch (err) {
      self.postMessage({ ok: false, error: String(err) })
    }
  }

  if (req.type === 'toCSV') {
    try {
      const csv = Papa.unparse(req.data, {
        delimiter: req.options.delimiter,
        header: req.options.includeHeader,
      })
      const result = req.options.bom ? '\uFEFF' + csv : csv
      self.postMessage({ ok: true, csv: result })
    } catch (err) {
      self.postMessage({ ok: false, error: String(err) })
    }
  }
}
