export async function compressToBase64url(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text)
  const cs = new CompressionStream('deflate-raw')
  const writer = cs.writable.getWriter()
  writer.write(encoded)
  writer.close()
  const chunks: Uint8Array[] = []
  const reader = cs.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const buf = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) { buf.set(c, offset); offset += c.length }
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function decompressFromBase64url(b64url: string): Promise<string> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(b64)
  const buf = Uint8Array.from(binary, c => c.charCodeAt(0))
  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  writer.write(buf)
  writer.close()
  const chunks: Uint8Array[] = []
  const reader = ds.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) { out.set(c, offset); offset += c.length }
  return new TextDecoder().decode(out)
}
