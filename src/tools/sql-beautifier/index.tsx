import { useState } from 'react'
import type { SqlLanguage, IndentStyle, LogicalOperatorNewline } from 'sql-formatter'
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
  indentStyle: IndentStyle
  logicalOperatorNewline: LogicalOperatorNewline
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

const INDENT_STYLES: { label: string; value: IndentStyle }[] = [
  { label: 'Padrão', value: 'standard' },
  { label: 'Tabular esquerda', value: 'tabularLeft' },
  { label: 'Tabular direita', value: 'tabularRight' },
]

const LOGICAL_NEWLINES: { label: string; value: LogicalOperatorNewline }[] = [
  { label: 'AND/OR no início', value: 'before' },
  { label: 'AND/OR no fim', value: 'after' },
]

const PLACEHOLDER = `SELECT
u.id, u.name, o.total
FROM users u
INNER JOIN orders o ON o.user_id = u.id
WHERE u.active = true AND o.total > 100
ORDER BY o.total DESC
LIMIT 50`

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-dim)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

function SelectField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function SqlBeautifier() {
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [dialect, setDialect] = useState<SqlLanguage>('sql')
  const [tabWidth, setTabWidth] = useState(2)
  const [uppercase, setUppercase] = useState(true)
  const [indentStyle, setIndentStyle] = useState<IndentStyle>('standard')
  const [logicalOperatorNewline, setLogicalOperatorNewline] = useState<LogicalOperatorNewline>('before')
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
    post({ type: 'format', sql: input, dialect, tabWidth, uppercase, indentStyle, logicalOperatorNewline })
  }

  useSubmitOnCmdEnter(format)

  return (
    <ToolLayout
      name="SQL Beautifier"
      description="Formate e embeleze queries SQL com suporte a múltiplos dialetos"
      badge="formatter"
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <SelectField label="Dialeto">
          <select
            className="select"
            value={dialect}
            onChange={e => setDialect(e.target.value as SqlLanguage)}
          >
            {DIALECTS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </SelectField>

        <SelectField label="Indentação">
          <select
            className="select"
            value={tabWidth}
            onChange={e => setTabWidth(Number(e.target.value))}
          >
            <option value={2}>2 espaços</option>
            <option value={4}>4 espaços</option>
          </select>
        </SelectField>

        <SelectField label="Estilo">
          <select
            className="select"
            value={indentStyle}
            onChange={e => setIndentStyle(INDENT_STYLES.find(s => s.value === e.target.value)?.value ?? 'standard')}
          >
            {INDENT_STYLES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </SelectField>

        <SelectField label="AND / OR">
          <select
            className="select"
            value={logicalOperatorNewline}
            onChange={e => setLogicalOperatorNewline(LOGICAL_NEWLINES.find(o => o.value === e.target.value)?.value ?? 'before')}
          >
            {LOGICAL_NEWLINES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </SelectField>

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
          {processing ? 'Formatando…' : <><span style={{ marginRight: 4, fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>⌘↵</span> Formatar SQL</>}
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
