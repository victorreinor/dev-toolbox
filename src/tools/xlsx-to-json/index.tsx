import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { CodeEditor } from '../../components/CodeEditor'
import { OutputActions } from '../../components/OutputActions'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { usePageDrop } from '../../hooks/usePageDrop'
import XlsxWorker from '../../workers/xlsxParser.worker?worker'
import { useWorker } from '../../hooks/useWorker'

interface WorkerResponse {
  ok: boolean
  data?: unknown[]
  sheetNames?: string[]
  error?: string
}

export default function XlsxToJson() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [header, setHeader] = useState(true)
  const [inferTypes, setInferTypes] = useState(true)
  const [jsonOutput, setJsonOutput] = useState('')
  const [processing, setProcessing] = useState(false)

  const { post } = useWorker<unknown, WorkerResponse>(
    () => new XlsxWorker(),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) { toast(res.error || 'Erro ao processar', 'error'); return }
        if (res.sheetNames) setSheetNames(res.sheetNames)
        setJsonOutput(JSON.stringify(res.data, null, 2))
        toast(`${res.data?.length ?? 0} linha(s) convertida(s)!`, 'success')
      },
      onError: () => { setProcessing(false); toast('Erro no worker', 'error') },
    }
  )

  const postRead = async (f: File, idx: number) => {
    const buf = await f.arrayBuffer()
    setProcessing(true)
    post({ type: 'read', buffer: buf, options: { sheetIndex: idx, header, inferTypes } })
  }

  const handleFile = (f: File) => {
    setFile(f)
    setSheetNames([])
    setJsonOutput('')
    postRead(f, 0)
  }

  const { draggingOver } = usePageDrop({ accept: ['.xlsx', '.xls'], onFile: handleFile })

  return (
    <ToolLayout name="XLSX → JSON" description="Converta planilhas Excel para JSON" badge="converter">
      <PageDropOverlay visible={draggingOver} accept=".xlsx, .xls" />
      <FileDropzone
        accept=".xlsx,.xls"
        hint=".xlsx, .xls · até 500MB"
        onFile={handleFile}
        state={processing ? 'processing' : file ? 'done' : 'idle'}
        fileName={file?.name}
        onClear={() => { setFile(null); setJsonOutput(''); setSheetNames([]) }}
      />

      {sheetNames.length > 1 && (
        <div className="field">
          <label className="label">Aba da planilha</label>
          <select className="select" value={sheetIndex} onChange={e => setSheetIndex(Number(e.target.value))}>
            {sheetNames.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="checkbox-label">
          <input type="checkbox" checked={header} onChange={e => setHeader(e.target.checked)} />
          Usar primeira linha como header
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={inferTypes} onChange={e => setInferTypes(e.target.checked)} />
          Inferir tipos
        </label>
        {file && (
          <button className="btn" onClick={() => postRead(file, sheetIndex)} disabled={processing}>
            {processing && <span className="spinner" />}
            {processing ? 'Processando…' : 'Reaplicar opções'}
          </button>
        )}
      </div>

      {jsonOutput && (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <OutputActions data={jsonOutput} filename="output.json" mimeType="application/json" />
          </div>
          <CodeEditor value={jsonOutput} readOnly label="JSON" minHeight={240} />
        </>
      )}
    </ToolLayout>
  )
}
