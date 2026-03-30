function randomDigits(): number[] {
  return Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
}

function calcDigit(digits: number[], weights: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0)
  const rem = sum % 11
  return rem < 2 ? 0 : 11 - rem
}

export function generateCPF(formatted: boolean): string {
  const d = randomDigits()
  const d1 = calcDigit(d, [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = calcDigit([...d, d1], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  const all = [...d, d1, d2]
  const raw = all.join('')

  if (!formatted) return raw
  return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`
}

export function generateCPFs(count: number, formatted: boolean): string[] {
  return Array.from({ length: Math.min(count, 1000) }, () => generateCPF(formatted))
}
