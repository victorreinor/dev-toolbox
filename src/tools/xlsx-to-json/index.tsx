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
  sheets?: Record<string, unknown[]>
  sheetNames?: string[]
  error?: string
}

export default function XlsxToJson() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
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

        const sheetNames = res.sheetNames ?? []
        const sheets = res.sheets ?? {}

        if (sheetNames.length === 1) {
          const data = sheets[sheetNames[0]] ?? []
          setJsonOutput(JSON.stringify(data, null, 2))
          toast(`${data.length} linha(s) convertida(s)!`, 'success')
        } else {
          const result: Record<string, unknown[]> = {}
          for (const name of sheetNames) result[name] = sheets[name] ?? []
          setJsonOutput(JSON.stringify(result, null, 2))
          const total = Object.values(result).reduce((s, rows) => s + rows.length, 0)
          toast(`${sheetNames.length} abas · ${total} linha(s) convertida(s)!`, 'success')
        }
      },
      onError: () => { setProcessing(false); toast('Erro no worker', 'error') },
    }
  )

  const postRead = async (f: File) => {
    const buf = await f.arrayBuffer()
    setProcessing(true)
    post({ type: 'read', buffer: buf, options: { header, inferTypes } })
  }

  const handleFile = (f: File) => {
    setFile(f)
    setJsonOutput('')
    postRead(f)
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
        onClear={() => { setFile(null); setJsonOutput('') }}
      />

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
          <button className="btn" onClick={() => postRead(file)} disabled={processing}>
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
