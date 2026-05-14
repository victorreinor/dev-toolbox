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

function buildOutput(
  sheets: Record<string, unknown[]>,
  names: string[],
  exportAll: boolean,
  idx: number,
): string {
  if (names.length === 1 || exportAll) {
    if (names.length === 1) return JSON.stringify(sheets[names[0]], null, 2)
    const result: Record<string, unknown[]> = {}
    for (const name of names) result[name] = sheets[name]
    return JSON.stringify(result, null, 2)
  }
  return JSON.stringify(sheets[names[idx]] ?? [], null, 2)
}

export default function XlsxToJson() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [rawSheets, setRawSheets] = useState<Record<string, unknown[]> | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [exportAll, setExportAll] = useState(true)
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0)
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

        const names = res.sheetNames ?? []
        const sheets = res.sheets ?? {}
        const all = names.length > 1

        setRawSheets(sheets)
        setSheetNames(names)
        setExportAll(all)
        setSelectedSheetIndex(0)
        setJsonOutput(buildOutput(sheets, names, all, 0))

        const total = Object.values(sheets).reduce((s, rows) => s + rows.length, 0)
        const label = names.length > 1 ? `${names.length} abas · ${total} linha(s)` : `${total} linha(s)`
        toast(`${label} convertida(s)!`, 'success')
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
    setRawSheets(null)
    setSheetNames([])
    setJsonOutput('')
    postRead(f)
  }

  const handleExportAll = (checked: boolean) => {
    setExportAll(checked)
    if (rawSheets) setJsonOutput(buildOutput(rawSheets, sheetNames, checked, selectedSheetIndex))
  }

  const handleSheetChange = (idx: number) => {
    setSelectedSheetIndex(idx)
    if (rawSheets) setJsonOutput(buildOutput(rawSheets, sheetNames, exportAll, idx))
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
        onClear={() => { setFile(null); setRawSheets(null); setSheetNames([]); setJsonOutput('') }}
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
        {sheetNames.length > 1 && (
          <label className="checkbox-label">
            <input type="checkbox" checked={exportAll} onChange={e => handleExportAll(e.target.checked)} />
            Exportar todas as abas
          </label>
        )}
        {file && (
          <button className="btn" onClick={() => postRead(file)} disabled={processing}>
            {processing && <span className="spinner" />}
            {processing ? 'Processando…' : 'Reaplicar opções'}
          </button>
        )}
      </div>

      {sheetNames.length > 1 && !exportAll && (
        <div className="field">
          <label className="label">Aba da planilha</label>
          <select
            className="select"
            value={selectedSheetIndex}
            onChange={e => handleSheetChange(Number(e.target.value))}
          >
            {sheetNames.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </div>
      )}

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
