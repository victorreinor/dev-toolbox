import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { CodeEditor } from '../../components/CodeEditor'
import { DataTable } from '../../components/DataTable'
import { OutputActions } from '../../components/OutputActions'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { useJsonFileInput } from '../../hooks/useJsonFileInput'
import { DELIMITERS } from '../../constants/delimiters'
import Papa from 'papaparse'

const UTF8_BOM = '\uFEFF'

const ENCODINGS = [
  { label: 'UTF-8', value: 'utf8' },
  { label: 'UTF-8 BOM', value: 'utf8bom' },
]

export default function JsonToCsv() {
  const { toast } = useToast()
  const { mode, setMode, file, fileData, handleFile, clearFile, draggingOver } = useJsonFileInput()
  const [delimiter, setDelimiter] = useState(',')
  const [encoding, setEncoding] = useState('utf8')
  const [includeHeader, setIncludeHeader] = useState(true)
  const [jsonText, setJsonText] = useState('')
  const [csvOutput, setCsvOutput] = useState('')
  const [previewRows, setPreviewRows] = useState<string[][]>([])

  const convert = () => {
    const data = mode === 'file' ? fileData.current : (() => {
      try { const p = JSON.parse(jsonText); return Array.isArray(p) ? p : [p] } catch { return null }
    })()
    if (!data) { toast('JSON inválido', 'error'); return }
    if (data.length === 0) { toast('Array vazio', 'error'); return }

    const csv = Papa.unparse(data, { delimiter, header: includeHeader })
    setCsvOutput(encoding === 'utf8bom' ? UTF8_BOM + csv : csv)
    setPreviewRows(csv.split('\n').slice(0, 51).map(l => l.split(delimiter)))
    toast('CSV gerado!', 'success')
  }

  const headers = includeHeader ? (previewRows[0] ?? []) : []
  const rows = previewRows.slice(includeHeader ? 1 : 0, 51)

  return (
    <ToolLayout name="JSON → CSV" description="Converta arrays JSON para CSV com opções de separador e encoding" badge="converter">
      <PageDropOverlay visible={draggingOver} accept=".json" />

      <div style={{ display: 'flex', gap: 8 }}>
        {(['text', 'file'] as const).map(m => (
          <button key={m} className={`btn ${mode === m ? 'primary' : 'ghost'}`} onClick={() => setMode(m)}>
            {m === 'text' ? 'Colar JSON' : 'Upload arquivo'}
          </button>
        ))}
      </div>

      {mode === 'text' ? (
        <CodeEditor
          value={jsonText}
          onChange={setJsonText}
          placeholder={'[\n  { "id": 1, "nome": "Ana" },\n  { "id": 2, "nome": "Bob" }\n]'}
          label="JSON"
          minHeight={180}
        />
      ) : (
        <FileDropzone
          accept=".json"
          hint=".json · até 500MB"
          onFile={handleFile}
          state={file ? 'done' : 'idle'}
          fileName={file?.name}
          onClear={() => { clearFile(); setCsvOutput(''); setPreviewRows([]) }}
        />
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label className="label">Separador</label>
          <select className="select" value={delimiter} onChange={e => setDelimiter(e.target.value)}>
            {DELIMITERS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label className="label">Encoding</label>
          <select className="select" value={encoding} onChange={e => setEncoding(e.target.value)}>
            {ENCODINGS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={includeHeader} onChange={e => setIncludeHeader(e.target.checked)} />
          Incluir header
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={convert}>Converter</button>
        <OutputActions
          data={csvOutput}
          filename="output.csv"
          mimeType="text/csv"
          onClear={() => { setCsvOutput(''); setPreviewRows([]) }}
        />
      </div>

      {previewRows.length > 0 && (
        <div>
          <span className="label">Preview — {rows.length} linha(s)</span>
          <DataTable headers={headers} rows={rows} />
        </div>
      )}
    </ToolLayout>
  )
}
