// Shared helper for workers whose result is a (potentially file-scale) text blob.
//
// The full string is built HERE, inside the worker, and handed back as a Blob —
// Blobs are cloned by reference across postMessage, so the giant string bytes never
// get copied into the UI thread nor rendered line-by-line. The main thread only ever
// sees the short preview.

const PREVIEW_LINES = 1000
// Hard cap so a value with few newlines but huge lines (one big string, a wide
// single statement) can't slip the whole file-scale string past the preview.
const PREVIEW_CHARS = 100_000

export interface TextOutput {
  blob: Blob
  preview: string
  previewTruncated: boolean
}

export function buildTextOutput(text: string, mimeType: string): TextOutput {
  const blob = new Blob([text], { type: mimeType })

  // Cut at PREVIEW_LINES newlines or PREVIEW_CHARS chars, whichever comes first,
  // without building a giant split array or scanning the whole string.
  const limit = Math.min(text.length, PREVIEW_CHARS)
  let newlines = 0
  for (let i = 0; i < limit; i++) {
    if (text.charCodeAt(i) === 10 /* \n */ && ++newlines >= PREVIEW_LINES) {
      return { blob, preview: text.slice(0, i), previewTruncated: true }
    }
  }
  const truncated = limit < text.length
  return { blob, preview: truncated ? text.slice(0, limit) : text, previewTruncated: truncated }
}
