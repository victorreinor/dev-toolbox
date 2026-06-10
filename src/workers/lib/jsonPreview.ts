// Shared helper for "→ JSON" workers.
//
// The whole point is that JSON.stringify of a large dataset (which can produce a
// 100MB+ string) runs HERE, inside the worker, never on the main thread. We hand
// the main thread back only a small text preview plus a Blob — Blobs are cloned by
// reference across postMessage, so the giant string bytes never get copied into the
// UI thread nor rendered line-by-line.

const PREVIEW_LINES = 1000

export interface JsonOutput {
  blob: Blob
  preview: string
  previewTruncated: boolean
}

export function buildJsonOutput(value: unknown): JsonOutput {
  const json = JSON.stringify(value, null, 2)
  const blob = new Blob([json], { type: 'application/json' })

  // Cut the preview at PREVIEW_LINES newlines without building a giant split array.
  let newlines = 0
  for (let i = 0; i < json.length; i++) {
    if (json.charCodeAt(i) === 10 /* \n */) {
      newlines++
      if (newlines >= PREVIEW_LINES) {
        return { blob, preview: json.slice(0, i), previewTruncated: true }
      }
    }
  }
  return { blob, preview: json, previewTruncated: false }
}
