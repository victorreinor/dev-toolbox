import { useState, useMemo } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { CodeEditor } from '../../components/CodeEditor'
import { OutputActions } from '../../components/OutputActions'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { useJsonFileInput } from '../../hooks/useJsonFileInput'
import { generateSQL, type SqlDialect, type SqlOperation } from './processor'

const OPERATIONS: SqlOperation[] = ['INSERT', 'UPDATE', 'UPSERT', 'DELETE']
const DIALECTS: { label: string; value: SqlDialect }[] = [
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgres' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'MSSQL', value: 'mssql' },
]

export default function JsonToSql() {
  const { toast } = useToast()
  const { mode, setMode, file, fileData, handleFile, clearFile, draggingOver } = useJsonFileInput()
  const [jsonText, setJsonText] = useState('')
  const [table, setTable] = useState('users')
  const [operation, setOperation] = useState<SqlOperation>('INSERT')
  const [dialect, setDialect] = useState<SqlDialect>('mysql')
  const [keyInput, setKeyInput] = useState('id')
  const [batchSize, setBatchSize] = useState(500)
  const [sqlOutput, setSqlOutput] = useState('')

  const keyFields = useMemo(
    () => keyInput.split(',').map(k => k.trim()).filter(Boolean),
    [keyInput]
  )

  const needsKey = operation === 'UPDATE' || operation === 'DELETE' || operation === 'UPSERT'

  const convert = () => {
    const data = mode === 'file' ? fileData.current : (() => {
      try { const p = JSON.parse(jsonText); return Array.isArray(p) ? p : [p] } catch { return null }
    })()
    if (!data) { toast('JSON inválido', 'error'); return }
    if (data.length === 0) { toast('Array vazio', 'error'); return }
    if (!table.trim()) { toast('Informe o nome da tabela', 'error'); return }
    if (needsKey && keyFields.length === 0) { toast('Informe o(s) campo(s) chave', 'error'); return }

    setSqlOutput(generateSQL(data, { table, operation, dialect, keyFields, batchSize }))
    toast(`${data.length} statement(s) gerado(s)!`, 'success')
  }

  return (
    <ToolLayout name="JSON → SQL" description="Gere statements SQL a partir de arrays JSON" badge="converter">
      <PageDropOverlay visible={draggingOver} accept=".json" />

      <div style={{ display: 'flex', gap: 8 }}>
        {(['text', 'file'] as const).map(m => (
          <button key={m} className={`btn ${mode === m ? 'primary' : 'ghost'}`} onClick={() => setMode(m)}>
            {m === 'text' ? 'Colar JSON' : 'Upload arquivo'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: 2, minWidth: 160 }}>
          <label className="label">Nome da tabela</label>
          <input className="input" value={table} onChange={e => setTable(e.target.value)} placeholder="users" />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 130 }}>
          <label className="label">Dialeto</label>
          <select className="select" value={dialect} onChange={e => setDialect(e.target.value as SqlDialect)}>
            {DIALECTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        {operation === 'INSERT' && (
          <div className="field" style={{ minWidth: 90 }}>
            <label className="label">Batch size</label>
            <input className="input" type="number" min={1} max={5000} value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} />
          </div>
        )}
      </div>

      <div className="field">
        <label className="label">Operação</label>
        <div className="radio-group">
          {OPERATIONS.map(op => (
            <label key={op} className={`radio-option ${operation === op ? 'active' : ''}`}>
              <input type="radio" name="operation" value={op} checked={operation === op} onChange={() => setOperation(op)} />
              {op}
            </label>
          ))}
        </div>
      </div>

      {needsKey && (
        <div className="field">
          <label className="label">Campo(s) chave (separados por vírgula)</label>
          <input className="input" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="id" />
        </div>
      )}

      {mode === 'text' ? (
        <CodeEditor
          value={jsonText}
          onChange={setJsonText}
          placeholder={'[\n  { "id": 1, "nome": "Ana", "email": "ana@email.com" },\n  { "id": 2, "nome": "Bob", "email": "bob@email.com" }\n]'}
          label="JSON"
          minHeight={160}
        />
      ) : (
        <FileDropzone
          accept=".json"
          hint=".json · até 500MB"
          onFile={handleFile}
          state={file ? 'done' : 'idle'}
          fileName={file?.name}
          onClear={() => { clearFile(); setSqlOutput('') }}
        />
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={convert}>Gerar SQL</button>
        <OutputActions
          data={sqlOutput}
          filename="output.sql"
          mimeType="text/plain"
          onClear={() => setSqlOutput('')}
        />
      </div>

      {sqlOutput && <CodeEditor value={sqlOutput} readOnly label="SQL" minHeight={240} />}
    </ToolLayout>
  )
}
