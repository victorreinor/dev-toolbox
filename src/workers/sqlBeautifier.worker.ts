import { format, type SqlLanguage, type IndentStyle, type LogicalOperatorNewline } from 'sql-formatter'

interface WorkerRequest {
  type: 'format'
  sql: string
  dialect: SqlLanguage
  tabWidth: number
  uppercase: boolean
  indentStyle: IndentStyle
  logicalOperatorNewline: LogicalOperatorNewline
}

interface WorkerResponse {
  ok: boolean
  result?: string
  error?: string
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, sql, dialect, tabWidth, uppercase, indentStyle, logicalOperatorNewline } = e.data

  if (type !== 'format') return

  try {
    const result = format(sql, {
      language: dialect,
      tabWidth,
      keywordCase: uppercase ? 'upper' : 'preserve',
      indentStyle,
      logicalOperatorNewline,
    })

    const response: WorkerResponse = { ok: true, result }
    self.postMessage(response)
  } catch (err) {
    const response: WorkerResponse = {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao formatar SQL',
    }
    self.postMessage(response)
  }
}
