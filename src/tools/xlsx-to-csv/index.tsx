import { useState, useRef, useCallback } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { DownloadButton } from '../../components/DownloadButton'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { usePageDrop } from '../../hooks/usePageDrop'
import { DELIMITERS } from '../../constants/delimiters'
import XlsxWorker from '../../workers/xlsxParser.worker?worker'
import { useWorker } from '../../hooks/useWorker'

interface WorkerResponse {
  ok: boolean
  csv?: string
  sheetNames?: string[]
  error?: string
}

export default function XlsxToCsv() {
  const { toast } = useToast()
  const fileBuffer = useRef<ArrayBuffer | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [delimiter, setDelimiter] = useState(',')
  const [bom, setBom] = useState(false)
  const [csvOutput, setCsvOutput] = useState('')
  const [processing, setProcessing] = useState(false)

  const { post } = useWorker<unknown, WorkerResponse>(
    () => new XlsxWorker(),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) { toast(res.error || 'Erro ao processar', 'error'); return }
        if (res.sheetNames) setSheetNames(res.sheetNames)
        if (res.csv !== undefined) {
          setCsvOutput(res.csv)
          toast('CSV gerado com sucesso!', 'success')
        }
      },
      onError: () => { setProcessing(false); toast('Erro no worker', 'error') },
    }
  )

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setCsvOutput('')
    fileBuffer.current = await f.arrayBuffer()
    post({ type: 'read', buffer: fileBuffer.current, options: { sheetIndex: 0, header: true, inferTypes: false } })
  }, [post])

  const { draggingOver } = usePageDrop({ accept: ['.xlsx', '.xls'], onFile: handleFile })

  const convert = () => {
    if (!fileBuffer.current) return
    setProcessing(true)
    post({ type: 'writeCSV', buffer: fileBuffer.current, options: { sheetIndex, delimiter, bom } })
  }

  const clear = () => {
    setFile(null)
    fileBuffer.current = null
    setCsvOutput('')
    setSheetNames([])
  }

  return (
    <ToolLayout name="XLSX → CSV" description="Converta planilhas Excel para CSV" badge="converter">
      <PageDropOverlay visible={draggingOver} accept=".xlsx, .xls" />
      <FileDropzone
        accept=".xlsx,.xls"
        hint=".xlsx, .xls · até 500MB"
        onFile={handleFile}
        state={file ? 'done' : 'idle'}
        fileName={file?.name}
        onClear={clear}
      />

      {sheetNames.length > 1 && (
        <div className="field">
          <label className="label">Aba da planilha</label>
          <select className="select" value={sheetIndex} onChange={e => setSheetIndex(Number(e.target.value))}>
            {sheetNames.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label className="label">Separador</label>
          <select className="select" value={delimiter} onChange={e => setDelimiter(e.target.value)}>
            {DELIMITERS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={bom} onChange={e => setBom(e.target.checked)} />
          UTF-8 BOM
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={convert} disabled={!file || processing}>
          {processing && <span className="spinner" />}
          {processing ? 'Processando…' : 'Converter'}
        </button>
        <DownloadButton data={csvOutput} filename="output.csv" mimeType="text/csv" label="Baixar CSV" />
        {csvOutput && <button className="btn ghost" onClick={() => setCsvOutput('')}>Limpar</button>}
      </div>

      {csvOutput && (
        <div>
          <span className="label">Preview</span>
          <div style={{
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12,
            color: 'var(--text-muted)', background: 'var(--surface)',
            maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre', overflowX: 'auto', marginTop: 8,
          }}>
            {csvOutput.split('\n').slice(0, 20).join('\n')}
            {csvOutput.split('\n').length > 20 && '\n…'}
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
