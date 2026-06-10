import { useState, useRef, useCallback } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { CodeEditor } from '../../components/CodeEditor'
import { JsonOutputPanel } from '../../components/JsonOutputPanel'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { usePageDrop } from '../../hooks/usePageDrop'
import { useWorker } from '../../hooks/useWorker'
import { DELIMITERS_WITH_AUTO } from '../../constants/delimiters'

type InputMode = 'file' | 'text'

interface WorkerRequest {
  type: 'parseToJson'
  text: string
  options: { header: boolean; inferTypes: boolean; delimiter: string }
}

interface WorkerResponse {
  ok: boolean
  blob?: Blob
  preview?: string
  previewTruncated?: boolean
  rowCount?: number
  error?: string
}

export default function CsvToJson() {
  const { toast } = useToast()
  const [mode, setMode] = useState<InputMode>('text')
  const [csvText, setCsvText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileTextCache = useRef<string | null>(null)
  const [delimiter, setDelimiter] = useState('')
  const [header, setHeader] = useState(true)
  const [inferTypes, setInferTypes] = useState(true)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState('')
  const [previewTruncated, setPreviewTruncated] = useState(false)
  const [processing, setProcessing] = useState(false)

  const { post } = useWorker<WorkerRequest, WorkerResponse>(
    () => new Worker(new URL('../../workers/csvParser.worker.ts', import.meta.url), { type: 'module' }),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) { toast(res.error ?? 'Erro ao processar', 'error'); return }
        setBlob(res.blob ?? null)
        setPreview(res.preview ?? '')
        setPreviewTruncated(res.previewTruncated ?? false)
        toast(`${res.rowCount ?? 0} linha(s) convertida(s)!`, 'success')
      },
      onError: () => { setProcessing(false); toast('Erro inesperado no worker', 'error') },
    }
  )

  const handleFile = useCallback((f: File) => {
    setMode('file')
    setFile(f)
    setBlob(null)
    setPreview('')
    fileTextCache.current = null
    f.text().then(t => { fileTextCache.current = t })
  }, [])

  const { draggingOver } = usePageDrop({ accept: ['.csv', '.txt'], onFile: handleFile })

  const convert = async () => {
    let text: string
    if (mode === 'file') {
      if (!file) { toast('Nenhum arquivo selecionado', 'error'); return }
      text = fileTextCache.current ?? await file.text()
      fileTextCache.current = text
    } else {
      text = csvText
    }
    if (!text.trim()) { toast('Nenhum dado para converter', 'error'); return }

    setBlob(null)
    setPreview('')
    setProcessing(true)
    post({ type: 'parseToJson', text, options: { header, inferTypes, delimiter } })
  }

  const clear = () => {
    setBlob(null)
    setPreview('')
    if (mode === 'text') setCsvText('')
  }

  return (
    <ToolLayout name="CSV → JSON" description="Parse CSV para JSON com auto-detecção de separador" badge="converter">
      <PageDropOverlay visible={draggingOver} accept=".csv, .txt" />

      <div style={{ display: 'flex', gap: 8 }}>
        {(['text', 'file'] as InputMode[]).map(m => (
          <button key={m} className={`btn ${mode === m ? 'primary' : 'ghost'}`} onClick={() => setMode(m)}>
            {m === 'text' ? 'Colar CSV' : 'Upload arquivo'}
          </button>
        ))}
      </div>

      {mode === 'text' ? (
        <CodeEditor
          value={csvText}
          onChange={setCsvText}
          placeholder="id,nome,cidade&#10;1,Ana,São Paulo&#10;2,Bob,Rio de Janeiro"
          label="CSV"
          minHeight={180}
        />
      ) : (
        <FileDropzone
          accept=".csv,.txt"
          hint=".csv ou .txt · até 500MB"
          onFile={handleFile}
          state={processing ? 'processing' : file ? 'done' : 'idle'}
          fileName={file?.name}
          onClear={() => { setFile(null); fileTextCache.current = null; setBlob(null); setPreview('') }}
        />
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label className="label">Separador</label>
          <select className="select" value={delimiter} onChange={e => setDelimiter(e.target.value)}>
            {DELIMITERS_WITH_AUTO.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={header} onChange={e => setHeader(e.target.checked)} />
          Usar primeira linha como chave
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={inferTypes} onChange={e => setInferTypes(e.target.checked)} />
          Inferir tipos
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={convert} disabled={processing}>
          {processing && <span className="spinner" />}
          {processing ? 'Convertendo…' : 'Converter'}
        </button>
      </div>

      <JsonOutputPanel
        preview={preview}
        previewTruncated={previewTruncated}
        blob={blob}
        filename="output.json"
        onClear={clear}
      />
    </ToolLayout>
  )
}
