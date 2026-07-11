import { useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { BlobOutputPanel } from '../../components/BlobOutputPanel'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { usePageDrop } from '../../hooks/usePageDrop'
import XlsxWorker from '../../workers/xlsxParser.worker?worker'
import { useWorker } from '../../hooks/useWorker'

interface WorkerResponse {
  ok: boolean
  blob?: Blob
  preview?: string
  previewTruncated?: boolean
  sheetNames?: string[]
  rowCount?: number
  error?: string
}

interface ReadOptions {
  header: boolean
  inferTypes: boolean
  exportAll: boolean
  sheetIndex: number
}

export default function XlsxToJson() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [exportAll, setExportAll] = useState(true)
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0)
  const [header, setHeader] = useState(true)
  const [inferTypes, setInferTypes] = useState(true)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState('')
  const [previewTruncated, setPreviewTruncated] = useState(false)
  const [processing, setProcessing] = useState(false)
  const hasWorkbook = useRef(false)

  const { post } = useWorker<unknown, WorkerResponse>(
    () => new XlsxWorker(),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) { toast(res.error || 'Erro ao processar', 'error'); return }

        const names = res.sheetNames ?? []
        if (!hasWorkbook.current) {
          // First successful read: default to "export all" only when multi-sheet.
          setSheetNames(names)
          setExportAll(names.length > 1)
          setSelectedSheetIndex(0)
          hasWorkbook.current = true
        }

        setBlob(res.blob ?? null)
        setPreview(res.preview ?? '')
        setPreviewTruncated(res.previewTruncated ?? false)
        toast(`${res.rowCount ?? 0} linha(s) convertida(s)!`, 'success')
      },
      onError: () => { setProcessing(false); toast('Erro no worker', 'error') },
    }
  )

  const currentOptions = (over?: Partial<ReadOptions>): ReadOptions => ({
    header, inferTypes, exportAll, sheetIndex: selectedSheetIndex, ...over,
  })

  const handleFile = async (f: File) => {
    setFile(f)
    setBlob(null)
    setPreview('')
    setSheetNames([])
    hasWorkbook.current = false
    const buffer = await f.arrayBuffer()
    setProcessing(true)
    post({ type: 'read', buffer, options: currentOptions() })
  }

  // Re-run with new options; the worker reuses the cached workbook (no re-upload).
  const rebuild = (over?: Partial<ReadOptions>) => {
    if (!hasWorkbook.current) return
    setProcessing(true)
    post({ type: 'rebuild', options: currentOptions(over) })
  }

  const handleExportAll = (checked: boolean) => {
    setExportAll(checked)
    rebuild({ exportAll: checked })
  }

  const handleSheetChange = (idx: number) => {
    setSelectedSheetIndex(idx)
    rebuild({ sheetIndex: idx })
  }

  const handleHeader = (checked: boolean) => {
    setHeader(checked)
    rebuild({ header: checked })
  }

  const handleInferTypes = (checked: boolean) => {
    setInferTypes(checked)
    rebuild({ inferTypes: checked })
  }

  const clear = () => {
    setFile(null)
    setBlob(null)
    setPreview('')
    setSheetNames([])
    hasWorkbook.current = false
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
        onClear={clear}
      />

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="checkbox-label">
          <input type="checkbox" checked={header} disabled={processing} onChange={e => handleHeader(e.target.checked)} />
          Usar primeira linha como header
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={inferTypes} disabled={processing} onChange={e => handleInferTypes(e.target.checked)} />
          Inferir tipos
        </label>
        {sheetNames.length > 1 && (
          <label className="checkbox-label">
            <input type="checkbox" checked={exportAll} disabled={processing} onChange={e => handleExportAll(e.target.checked)} />
            Exportar todas as abas
          </label>
        )}
        {processing && <span className="spinner" />}
      </div>

      {sheetNames.length > 1 && !exportAll && (
        <div className="field">
          <label className="label">Aba da planilha</label>
          <select
            className="select"
            value={selectedSheetIndex}
            disabled={processing}
            onChange={e => handleSheetChange(Number(e.target.value))}
          >
            {sheetNames.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </div>
      )}

      <BlobOutputPanel
        preview={preview}
        previewTruncated={previewTruncated}
        blob={blob}
        filename="output.json"
        onClear={clear}
      />
    </ToolLayout>
  )
}
