// ─── Types ───────────────────────────────────────────────────────────────────

type WorkerRequest =
  | { type: 'encode-start'; mimeType: string }
  | { type: 'encode-chunk'; data: ArrayBuffer }
  | { type: 'encode-end' }
  | { type: 'decode'; input: string }

interface WorkerResponse {
  ok: boolean
  opType?: 'encode' | 'decode'
  base64?: string
  dataUrl?: string
  mimeType?: string
  isImage?: boolean
  buffer?: ArrayBuffer
  error?: string
}

// ─── Encoder state ───────────────────────────────────────────────────────────

let pendingChunks: Uint8Array[] = []
let pendingMimeType = ''

// ─── Helpers ─────────────────────────────────────────────────────────────────

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// ─── Message handler ─────────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data

  try {
    if (msg.type === 'encode-start') {
      pendingChunks = []
      pendingMimeType = msg.mimeType
      return
    }

    if (msg.type === 'encode-chunk') {
      pendingChunks.push(new Uint8Array(msg.data))
      return
    }

    if (msg.type === 'encode-end') {
      const bytes = concatChunks(pendingChunks)
      pendingChunks = []
      const base64 = uint8ToBase64(bytes)
      const mimeType = pendingMimeType
      const dataUrl = `data:${mimeType};base64,${base64}`
      const response: WorkerResponse = {
        ok: true,
        opType: 'encode',
        base64,
        dataUrl,
        mimeType,
        isImage: mimeType.startsWith('image/'),
      }
      self.postMessage(response)
      return
    }

    if (msg.type === 'decode') {
      const trimmed = msg.input.trim()
      let base64 = trimmed
      let mimeType = 'application/octet-stream'

      const dataUrlMatch = trimmed.match(/^data:([^;]+);base64,(.+)$/s)
      if (dataUrlMatch) {
        mimeType = dataUrlMatch[1]
        base64 = dataUrlMatch[2]
      }

      const buffer = base64ToArrayBuffer(base64)
      const response: WorkerResponse = {
        ok: true,
        opType: 'decode',
        buffer,
        mimeType,
        isImage: mimeType.startsWith('image/'),
      }
      self.postMessage(response)
    }
  } catch (err) {
    pendingChunks = []
    self.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    })
  }
}
