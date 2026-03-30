import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { CodeEditor } from '../../components/CodeEditor'
import { DownloadButton } from '../../components/DownloadButton'
import { DataTable } from '../../components/DataTable'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { useJsonFileInput } from '../../hooks/useJsonFileInput'
import XlsxWorker from '../../workers/xlsxParser.worker?worker'
import { useWorker } from '../../hooks/useWorker'

interface WorkerResponse {
  ok: boolean
  buffer?: number[]
  error?: string
}

export default function JsonToXlsx() {
  const { toast } = useToast()
  const { mode, setMode, file, fileData, handleFile, clearFile, draggingOver } = useJsonFileInput()
  const [jsonText, setJsonText] = useState('')
  const [sheetName, setSheetName] = useState('Sheet1')
  const [flatSep, setFlatSep] = useState('_')
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null)
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState<Record<string, unknown>[]>([])

  const { post } = useWorker<unknown, WorkerResponse>(
    () => new XlsxWorker(),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) { toast(res.error || 'Erro ao processar', 'error'); return }
        setOutputBlob(new Blob([new Uint8Array(res.buffer!)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }))
        toast('XLSX gerado com sucesso!', 'success')
      },
      onError: () => { setProcessing(false); toast('Erro no worker', 'error') },
    }
  )

  const process = () => {
    const data = mode === 'file' ? fileData.current : (() => {
      try { const p = JSON.parse(jsonText); return Array.isArray(p) ? p : [p] } catch { return null }
    })()
    if (!data) { toast('JSON inválido', 'error'); return }
    if (data.length === 0) { toast('Array vazio', 'error'); return }
    setPreview(data.slice(0, 50))
    setProcessing(true)
    post({ type: 'writeXLSX', data, options: { sheetName, flattenSeparator: flatSep } })
  }

  const cols = preview.length > 0 ? Object.keys(preview[0]) : []
  const rows = preview.map(row => cols.map(c => row[c] as string))

  return (
    <ToolLayout name="JSON → XLSX" description="Converta arrays JSON para planilha Excel" badge="converter">
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
          placeholder={'[\n  { "id": 1, "nome": "Ana", "cidade": "SP" },\n  { "id": 2, "nome": "Bob", "cidade": "RJ" }\n]'}
          label="JSON"
          minHeight={200}
        />
      ) : (
        <FileDropzone
          accept=".json"
          hint=".json · até 500MB"
          onFile={handleFile}
          state={file ? 'done' : 'idle'}
          fileName={file?.name}
          onClear={() => { clearFile(); setPreview([]); setOutputBlob(null) }}
        />
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="label">Nome da aba</label>
          <input className="input" value={sheetName} onChange={e => setSheetName(e.target.value)} placeholder="Sheet1" />
        </div>
        <div className="field">
          <label className="label">Separador de campos aninhados</label>
          <input className="input" value={flatSep} onChange={e => setFlatSep(e.target.value)} placeholder="_" style={{ width: 80 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={process} disabled={processing}>
          {processing && <span className="spinner" />}
          {processing ? 'Processando…' : 'Converter'}
        </button>
        <DownloadButton data={outputBlob} filename="output.xlsx" label="Baixar XLSX" />
        {outputBlob && (
          <button className="btn ghost" onClick={() => { setOutputBlob(null); setPreview([]) }}>Limpar</button>
        )}
      </div>

      {preview.length > 0 && (
        <div>
          <span className="label">Preview — {preview.length} linha(s)</span>
          <DataTable headers={cols} rows={rows} />
        </div>
      )}
    </ToolLayout>
  )
}
