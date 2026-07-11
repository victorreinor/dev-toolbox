import { useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { DataTable } from '../../components/DataTable'
import { BlobOutputPanel } from '../../components/BlobOutputPanel'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { usePageDrop } from '../../hooks/usePageDrop'
import { useWorker } from '../../hooks/useWorker'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import XlsxToSqlWorker from '../../workers/xlsxToSql.worker?worker'
import type { GenerateOptions } from '../../workers/xlsxToSql.worker'
import { operationNeedsKey, type ColumnType, type SqlDialect, type SqlOperation } from '../../utils/sqlGenerator'

type WorkerResponse =
  | { ok: false; error: string }
  | {
      ok: true
      kind: 'sheet'
      sheetNames: string[]
      sheetIndex: number
      sheetName: string
      columns: string[]
      sampleRows: string[][]
      rowCount: number
    }
  | { ok: true; kind: 'sql'; blob: Blob; preview: string; previewTruncated: boolean; rowCount: number }

interface Column {
  source: string
  name: string
  type: ColumnType
  include: boolean
}

const OPERATIONS: SqlOperation[] = ['INSERT', 'UPDATE', 'UPSERT', 'DELETE']

const DIALECTS: { label: string; value: SqlDialect }[] = [
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgres' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'MSSQL', value: 'mssql' },
]

const COLUMN_TYPES: { label: string; value: ColumnType }[] = [
  { label: 'Auto', value: 'auto' },
  { label: 'Texto', value: 'text' },
  { label: 'Número', value: 'number' },
  { label: 'Booleano', value: 'boolean' },
  { label: 'Data', value: 'date' },
]

/** Sheet/column labels become SQL identifiers — strip accents, spaces and punctuation. */
function snakeCase(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'coluna'
}

export default function XlsxToSql() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)

  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [header, setHeader] = useState(true)
  const [columns, setColumns] = useState<Column[]>([])
  const [sampleRows, setSampleRows] = useState<string[][]>([])
  const [sheetRowCount, setSheetRowCount] = useState(0)

  const [table, setTable] = useState('')
  const [dialect, setDialect] = useState<SqlDialect>('mysql')
  const [operation, setOperation] = useState<SqlOperation>('INSERT')
  // Key columns are tracked by their immutable `source`, not the editable output
  // name, so renaming/normalizing a column never desyncs the key selection.
  const [keyFields, setKeyFields] = useState<string[]>([])
  const [batchSize, setBatchSize] = useState(500)
  const [emptyAsNull, setEmptyAsNull] = useState(true)
  const [createTable, setCreateTable] = useState(false)
  const [transaction, setTransaction] = useState(false)

  const [output, setOutput] = useState<{ blob: Blob; preview: string; truncated: boolean } | null>(null)

  const [loaded, setLoaded] = useState(false)
  const tableEdited = useRef(false)

  const resetSheet = () => {
    setColumns([])
    setSampleRows([])
    setSheetNames([])
    setKeyFields([])
    setOutput(null)
    setLoaded(false)
  }

  const { post } = useWorker<unknown, WorkerResponse>(
    () => new XlsxToSqlWorker(),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) { toast(res.error || 'Erro ao processar', 'error'); return }

        if (res.kind === 'sheet') {
          setLoaded(true)
          setSheetNames(res.sheetNames)
          setSheetIndex(res.sheetIndex)
          setColumns(res.columns.map(source => ({ source, name: source, type: 'auto', include: true })))
          setSampleRows(res.sampleRows)
          setSheetRowCount(res.rowCount)
          setKeyFields(res.columns.filter(n => n.toLowerCase() === 'id'))
          setOutput(null)
          if (!tableEdited.current && res.sheetName) setTable(snakeCase(res.sheetName))
          return
        }

        setOutput({ blob: res.blob, preview: res.preview, truncated: res.previewTruncated })
        toast(`SQL gerado a partir de ${res.rowCount} linha(s)!`, 'success')
      },
      onError: () => { setProcessing(false); toast('Erro no worker', 'error') },
    }
  )

  const handleFile = async (f: File) => {
    setFile(f)
    resetSheet()
    const buffer = await f.arrayBuffer()
    setProcessing(true)
    post({ type: 'read', buffer, header })
  }

  // Re-describe the sheet; the worker reuses the cached workbook (no re-upload).
  const inspect = (over?: { sheetIndex?: number; header?: boolean }) => {
    if (!loaded) return
    setProcessing(true)
    post({ type: 'inspect', sheetIndex: over?.sheetIndex ?? sheetIndex, header: over?.header ?? header })
  }

  const handleSheetChange = (idx: number) => {
    setSheetIndex(idx)
    inspect({ sheetIndex: idx })
  }

  const handleHeader = (checked: boolean) => {
    setHeader(checked)
    inspect({ header: checked })
  }

  const patchColumn = (source: string, patch: Partial<Column>) => {
    setColumns(prev => prev.map(c => (c.source === source ? { ...c, ...patch } : c)))
  }

  const toggleColumn = (col: Column, include: boolean) => {
    patchColumn(col.source, { include })
    if (!include) setKeyFields(prev => prev.filter(k => k !== col.source))
  }

  const renameColumn = (col: Column, name: string) => {
    patchColumn(col.source, { name })
  }

  const toggleKeyField = (source: string) => {
    setKeyFields(prev => (prev.includes(source) ? prev.filter(k => k !== source) : [...prev, source]))
  }

  const setAllColumns = (include: boolean) => {
    setColumns(prev => prev.map(c => ({ ...c, include })))
    if (!include) setKeyFields([])
  }

  const normalizeNames = () => {
    setColumns(prev => prev.map(c => ({ ...c, name: snakeCase(c.name) })))
  }

  const included = columns.filter(c => c.include)
  const needsKey = operationNeedsKey(operation)

  const generate = () => {
    if (!loaded) { toast('Envie uma planilha primeiro', 'error'); return }
    if (!table.trim()) { toast('Informe o nome da tabela', 'error'); return }
    if (included.length === 0) { toast('Selecione ao menos uma coluna', 'error'); return }
    if (included.some(c => !c.name.trim())) { toast('Toda coluna selecionada precisa de um nome', 'error'); return }

    const keyNames = included.filter(c => keyFields.includes(c.source)).map(c => c.name.trim())
    if (needsKey && keyNames.length === 0) { toast('Selecione o(s) campo(s) chave', 'error'); return }

    const options: GenerateOptions = {
      sheetIndex,
      header,
      columns: included.map(({ source, name, type }) => ({ source, name: name.trim(), type })),
      table: table.trim(),
      dialect,
      operation,
      keyFields: keyNames,
      batchSize,
      emptyAsNull,
      createTable,
      transaction,
    }
    setProcessing(true)
    post({ type: 'generate', options })
  }

  useSubmitOnCmdEnter(generate)

  const clear = () => {
    setFile(null)
    resetSheet()
  }

  const { draggingOver } = usePageDrop({ accept: ['.xlsx', '.xls'], onFile: handleFile })

  const includedIndexes = columns.flatMap((c, i) => (c.include ? [i] : []))

  return (
    <ToolLayout name="XLSX → SQL" description="Gere INSERT, UPDATE, UPSERT ou DELETE a partir de uma planilha Excel" badge="converter">
      <PageDropOverlay visible={draggingOver} accept=".xlsx, .xls" />

      <FileDropzone
        accept=".xlsx,.xls"
        hint=".xlsx, .xls · até 500MB"
        onFile={handleFile}
        state={processing ? 'processing' : file ? 'done' : 'idle'}
        fileName={file?.name}
        onClear={clear}
      />

      {loaded && (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={header} disabled={processing} onChange={e => handleHeader(e.target.checked)} />
              Usar primeira linha como header
            </label>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {sheetRowCount} linha(s) de dados
            </span>
            {processing && <span className="spinner" />}
          </div>

          {sheetNames.length > 1 && (
            <div className="field">
              <label className="label">Aba da planilha</label>
              <select className="select" value={sheetIndex} disabled={processing} onChange={e => handleSheetChange(Number(e.target.value))}>
                {sheetNames.map((n, i) => <option key={n} value={i}>{n}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 2, minWidth: 160 }}>
              <label className="label">Nome da tabela</label>
              <input
                className="input"
                value={table}
                onChange={e => { tableEdited.current = true; setTable(e.target.value) }}
                placeholder="users"
              />
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
              <label className="label">Campo(s) chave — usados no WHERE / ON CONFLICT</label>
              <div className="radio-group">
                {included.map(col => (
                  <label key={col.source} className={`radio-option ${keyFields.includes(col.source) ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={keyFields.includes(col.source)}
                      onChange={() => toggleKeyField(col.source)}
                      style={{ display: 'none' }}
                    />
                    {col.name || col.source}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label className="label" style={{ margin: 0 }}>Colunas ({included.length}/{columns.length})</label>
              <button className="btn ghost" onClick={() => setAllColumns(true)}>Todas</button>
              <button className="btn ghost" onClick={() => setAllColumns(false)}>Nenhuma</button>
              <button className="btn ghost" onClick={normalizeNames}>snake_case</button>
            </div>

            <div style={columnListStyle}>
              {columns.map(col => (
                <div key={col.source} style={columnRowStyle}>
                  <label className="checkbox-label" style={{ minWidth: 0, flex: 1 }}>
                    <input type="checkbox" checked={col.include} onChange={e => toggleColumn(col, e.target.checked)} />
                    <span style={sourceNameStyle} title={col.source}>{col.source}</span>
                  </label>
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: 120 }}
                    value={col.name}
                    disabled={!col.include}
                    onChange={e => renameColumn(col, e.target.value)}
                    placeholder="nome na tabela"
                  />
                  <select
                    className="select"
                    style={{ width: 130 }}
                    value={col.type}
                    disabled={!col.include}
                    onChange={e => patchColumn(col.source, { type: e.target.value as ColumnType })}
                  >
                    {COLUMN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={emptyAsNull} onChange={e => setEmptyAsNull(e.target.checked)} />
              Células vazias como NULL
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={createTable} onChange={e => setCreateTable(e.target.checked)} />
              Incluir CREATE TABLE
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={transaction} onChange={e => setTransaction(e.target.checked)} />
              Envolver em transação
            </label>
          </div>

          {sampleRows.length > 0 && includedIndexes.length > 0 && (
            <div className="field">
              <label className="label">Prévia dos dados</label>
              <DataTable
                headers={includedIndexes.map(i => columns[i].name || columns[i].source)}
                rows={sampleRows.map(row => includedIndexes.map(i => row[i] ?? ''))}
                maxHeight={200}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" onClick={generate} disabled={processing}>
              <span style={{ marginRight: 2, fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>⌘↵</span> Gerar SQL
            </button>
          </div>
        </>
      )}

      <BlobOutputPanel
        preview={output?.preview ?? ''}
        previewTruncated={output?.truncated ?? false}
        blob={output?.blob ?? null}
        filename="output.sql"
        label="SQL"
        onClear={() => setOutput(null)}
      />
    </ToolLayout>
  )
}

const columnListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  maxHeight: 280,
  overflowY: 'auto',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 8,
}

const columnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
}

const sourceNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
