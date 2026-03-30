export function parseJsonArray(text: string): Record<string, unknown>[] | null {
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return null
  }
}
