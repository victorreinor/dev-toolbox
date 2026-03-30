function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function calcCnpjDigit(digits: number[], weights: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0)
  const rem = sum % 11
  return rem < 2 ? 0 : 11 - rem
}

export function generateCNPJ(formatted: boolean): string {
  // 8 base digits + 4 sequential (typically 0001)
  const base = Array.from({ length: 8 }, () => randomInt(0, 9))
  const branch = [0, 0, 0, 1]
  const all12 = [...base, ...branch]

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const d1 = calcCnpjDigit(all12, w1)

  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const d2 = calcCnpjDigit([...all12, d1], w2)

  const raw = [...all12, d1, d2].join('')
  if (!formatted) return raw
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`
}

export function generateCNPJs(count: number, formatted: boolean): string[] {
  return Array.from({ length: Math.min(count, 1000) }, () => generateCNPJ(formatted))
}
