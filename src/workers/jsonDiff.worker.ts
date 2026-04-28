interface WorkerRequest {
  type: 'diff'
  left: string
  right: string
}

interface DiffLine {
  text: string
  status: 'added' | 'removed' | 'equal'
}

interface WorkerResponse {
  ok: boolean
  lines?: DiffLine[]
  stats?: { added: number; removed: number; equal: number }
  error?: string
}

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp
}

function computeDiff(a: string[], b: string[]): { lines: DiffLine[]; stats: { added: number; removed: number; equal: number } } {
  const dp = lcs(a, b)
  const lines: DiffLine[] = []
  const stats = { added: 0, removed: 0, equal: 0 }
  let i = a.length
  let j = b.length

  while (i > 0 || j > 0) {
    let status: DiffLine['status']
    let text: string

    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      status = 'equal'; text = a[i - 1]; i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      status = 'added'; text = b[j - 1]; j--
    } else {
      status = 'removed'; text = a[i - 1]; i--
    }

    lines.push({ text, status })
    stats[status]++
  }

  lines.reverse()
  return { lines, stats }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, left, right } = e.data

  if (type !== 'diff') return

  try {
    const leftFormatted = JSON.stringify(JSON.parse(left), null, 2)
    const rightFormatted = JSON.stringify(JSON.parse(right), null, 2)

    const { lines, stats } = computeDiff(leftFormatted.split('\n'), rightFormatted.split('\n'))

    const response: WorkerResponse = { ok: true, lines, stats }
    self.postMessage(response)
  } catch (err) {
    const response: WorkerResponse = {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }
    self.postMessage(response)
  }
}
