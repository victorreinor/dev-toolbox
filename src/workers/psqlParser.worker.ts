type DisplayMode = 'auto' | 'tabular' | 'expanded'

interface ParseRequest {
  type: 'parse'
  text: string
  mode: DisplayMode
  nullEmpty: boolean
}

function detectMode(text: string): 'tabular' | 'expanded' {
  return /^-\[ RECORD \d+/m.test(text) ? 'expanded' : 'tabular'
}

function toValue(raw: string, nullEmpty: boolean): string | null {
  const v = raw.trim()
  if (nullEmpty && v === '') return null
  return v
}

function parseTabular(text: string, nullEmpty: boolean): Record<string, string | null>[] {
  const lines = text.split('\n')

  // Find the separator line (only dashes and plus signs)
  const sepIdx = lines.findIndex(l => /^[-+][-+\s]*$/.test(l) && l.includes('+'))
  if (sepIdx < 1) throw new Error('Formato tabular inválido: linha separadora não encontrada')

  const headerLine = lines[sepIdx - 1]
  const headers = headerLine.split('|').map(h => h.trim()).filter((_, i, arr) => {
    // Remove empty last column if header ends with '|'
    return i < arr.length - 1 || _.length > 0
  })

  const results: Record<string, string | null>[] = []

  for (let i = sepIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || /^\(\d+ rows?\)/.test(line)) continue

    const parts = lines[i].split('|')
    const record: Record<string, string | null> = {}
    headers.forEach((h, idx) => {
      record[h] = toValue(parts[idx] ?? '', nullEmpty)
    })
    results.push(record)
  }

  return results
}

function parseExpanded(text: string, nullEmpty: boolean): Record<string, string | null>[] {
  const lines = text.split('\n')
  const results: Record<string, string | null>[] = []
  let current: Record<string, string | null> | null = null

  for (const line of lines) {
    if (/^-\[ RECORD \d+/.test(line)) {
      if (current) results.push(current)
      current = {}
      continue
    }
    if (!current) continue
    const pipeIdx = line.indexOf('|')
    if (pipeIdx === -1) continue
    const key = line.slice(0, pipeIdx).trim()
    const val = line.slice(pipeIdx + 1)
    if (key) current[key] = toValue(val, nullEmpty)
  }

  if (current && Object.keys(current).length > 0) results.push(current)

  return results
}

self.onmessage = (e: MessageEvent<ParseRequest>) => {
  const { text, mode, nullEmpty } = e.data
  try {
    const resolved = mode === 'auto' ? detectMode(text) : mode
    const data = resolved === 'expanded'
      ? parseExpanded(text, nullEmpty)
      : parseTabular(text, nullEmpty)

    self.postMessage({ ok: true, data, detectedMode: resolved })
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) })
  }
}
