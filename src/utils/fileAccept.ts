export function matchesAccept(file: File, accept: string | string[]): boolean {
  const types = Array.isArray(accept) ? accept : accept.split(',').map(s => s.trim())
  return types.some(type => {
    if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase())
    return file.type.startsWith(type.replace('*', ''))
  })
}
