interface WorkerRequest {
  type: 'dedup'
  text: string
  caseSensitive: boolean
  ignoreBlank: boolean
  trimLines: boolean
}

interface WorkerResponse {
  ok: boolean
  result?: string
  removedCount?: number
  error?: string
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, text, caseSensitive, ignoreBlank, trimLines } = e.data

  if (type !== 'dedup') return

  try {
    const lines = text.split(/\r?\n/)
    const seen = new Set<string>()
    const result: string[] = []
    let removedCount = 0

    for (const line of lines) {
      const processed = trimLines ? line.trim() : line

      if (ignoreBlank && processed === '') {
        result.push(line)
        continue
      }

      const key = caseSensitive ? processed : processed.toLowerCase()

      if (seen.has(key)) {
        removedCount++
      } else {
        seen.add(key)
        result.push(line)
      }
    }

    const response: WorkerResponse = {
      ok: true,
      result: result.join('\n'),
      removedCount,
    }
    self.postMessage(response)
  } catch (err) {
    const response: WorkerResponse = {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }
    self.postMessage(response)
  }
}
