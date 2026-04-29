import { useState } from 'react'
import type { SqlLanguage } from 'sql-formatter'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import { ToolLayout } from '../../components/ToolLayout'
import { CodeEditor } from '../../components/CodeEditor'
import { OutputActions } from '../../components/OutputActions'
import { useToast } from '../../components/Toast'
import { useWorker } from '../../hooks/useWorker'

interface WorkerRequest {
  type: 'format'
  sql: string
  dialect: SqlLanguage
  tabWidth: number
  uppercase: boolean
}

interface WorkerResponse {
  ok: boolean
  result?: string
  error?: string
}

const DIALECTS: { label: string; value: SqlLanguage }[] = [
  { label: 'SQL (genérico)', value: 'sql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'BigQuery', value: 'bigquery' },
  { label: 'Transact-SQL', value: 'transactsql' },
  { label: 'Spark SQL', value: 'spark' },
  { label: 'Trino / PrestoSQL', value: 'trino' },
]

const PLACEHOLDER = `SELECT
u.id, u.name, o.total
FROM users u
INNER JOIN orders o ON o.user_id = u.id
WHERE u.active = true AND o.total > 100
ORDER BY o.total DESC
LIMIT 50`

export default function SqlBeautifier() {
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [dialect, setDialect] = useState<SqlLanguage>('sql')
  const [tabWidth, setTabWidth] = useState(2)
  const [uppercase, setUppercase] = useState(true)
  const [processing, setProcessing] = useState(false)

  const { post } = useWorker<WorkerRequest, WorkerResponse>(
    () => new Worker(new URL('../../workers/sqlBeautifier.worker.ts', import.meta.url), { type: 'module' }),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) {
          toast(res.error ?? 'Erro ao formatar', 'error')
          return
        }
        setOutput(res.result ?? '')
        toast('SQL formatado', 'success')
      },
      onError: () => {
        setProcessing(false)
        toast('Erro inesperado no worker', 'error')
      },
    }
  )

  const format = () => {
    if (!input.trim()) { toast('Cole o SQL para formatar', 'error'); return }
    setOutput('')
    setProcessing(true)
    post({ type: 'format', sql: input, dialect, tabWidth, uppercase })
  }

  useSubmitOnCmdEnter(format)

  return (
    <ToolLayout
      name="SQL Beautifier"
      description="Formate e embeleze queries SQL com suporte a múltiplos dialetos"
      badge="formatter"
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Dialeto</label>
          <select
            className="select"
            value={dialect}
            onChange={e => setDialect(e.target.value as SqlLanguage)}
          >
            {DIALECTS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Indentação</label>
          <select
            className="select"
            value={tabWidth}
            onChange={e => setTabWidth(Number(e.target.value))}
          >
            <option value={2}>2 espaços</option>
            <option value={4}>4 espaços</option>
          </select>
        </div>

        <label className="checkbox-label" style={{ paddingBottom: 2 }}>
          <input type="checkbox" checked={uppercase} onChange={e => setUppercase(e.target.checked)} />
          Keywords em maiúsculas
        </label>
      </div>

      <CodeEditor
        value={input}
        onChange={setInput}
        label="SQL de entrada"
        placeholder={PLACEHOLDER}
        minHeight={220}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={format} disabled={processing}>
          {processing ? 'Formatando…' : 'Formatar SQL'}
        </button>
        <OutputActions
          data={output}
          filename="query.sql"
          mimeType="text/plain"
          onClear={() => { setOutput(''); setInput('') }}
        />
      </div>

      {output && (
        <CodeEditor value={output} readOnly label="SQL formatado" minHeight={220} />
      )}
    </ToolLayout>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-dim)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
