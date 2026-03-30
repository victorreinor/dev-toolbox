import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { CodeEditor } from '../../components/CodeEditor'
import { DataTable } from '../../components/DataTable'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { DownloadButton } from '../../components/DownloadButton'
import { useToast } from '../../components/Toast'
import { usePageDrop } from '../../hooks/usePageDrop'
import { DELIMITERS } from '../../constants/delimiters'

export default function CsvToXlsx() {
  const { toast } = useToast()
  const [mode, setMode] = useState<'text' | 'file'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState('')
  const [delimiter, setDelimiter] = useState(',')
  const [sheetName, setSheetName] = useState('Sheet1')
  const [hasHeader, setHasHeader] = useState(true)
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string[][]>([])

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setOutputBlob(null)
    setPreview([])
    const reader = new FileReader()
    reader.onload = e => setCsvText(e.target?.result as string)
    reader.readAsText(f, 'utf-8')
  }, [])

  const { draggingOver } = usePageDrop({ accept: ['.csv', '.txt'], onFile: handleFile })

  const convert = () => {
    const source = csvText.trim()
    if (!source) { toast('Nenhum CSV para converter', 'error'); return }

    try {
      const parsed = Papa.parse<string[]>(source, { delimiter, skipEmptyLines: true })

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        toast('Erro ao parsear CSV', 'error')
        return
      }

      const rows = parsed.data as string[][]
      if (rows.length === 0) { toast('CSV vazio', 'error'); return }

      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1')

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
      setOutputBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      setPreview(rows.slice(0, 51))
      toast(`${hasHeader ? rows.length - 1 : rows.length} linha(s) convertida(s)!`, 'success')
    } catch (err) {
      toast(`Erro: ${String(err)}`, 'error')
    }
  }

  const clear = () => {
    setFile(null)
    setCsvText('')
    setOutputBlob(null)
    setPreview([])
  }

  const headers = hasHeader ? (preview[0] ?? []) : []
  const rows = preview.slice(hasHeader ? 1 : 0)

  return (
    <ToolLayout name="CSV → XLSX" description="Converta arquivos CSV para planilha Excel (.xlsx)" badge="converter">
      <PageDropOverlay visible={draggingOver} accept=".csv, .txt" />

      <div style={{ display: 'flex', gap: 8 }}>
        {(['file', 'text'] as const).map(m => (
          <button key={m} className={`btn ${mode === m ? 'primary' : 'ghost'}`} onClick={() => setMode(m)}>
            {m === 'file' ? 'Upload arquivo' : 'Colar CSV'}
          </button>
        ))}
      </div>

      {mode === 'file' ? (
        <FileDropzone
          accept=".csv,.txt"
          hint=".csv, .txt · até 500MB"
          onFile={handleFile}
          state={file ? 'done' : 'idle'}
          fileName={file?.name}
          onClear={clear}
        />
      ) : (
        <CodeEditor
          value={csvText}
          onChange={setCsvText}
          placeholder={'id,nome,cidade\n1,Ana,São Paulo\n2,Bob,Rio de Janeiro'}
          label="CSV"
          minHeight={180}
        />
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field">
          <label className="label">Separador</label>
          <select className="select" value={delimiter} onChange={e => setDelimiter(e.target.value)}>
            {DELIMITERS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label className="label">Nome da aba</label>
          <input
            className="input"
            value={sheetName}
            onChange={e => setSheetName(e.target.value)}
            placeholder="Sheet1"
          />
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} />
          Primeira linha é header
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={convert} disabled={!csvText.trim()}>
          Converter
        </button>
        <DownloadButton
          data={outputBlob}
          filename={file ? file.name.replace(/\.(csv|txt)$/i, '.xlsx') : 'output.xlsx'}
          label="Baixar XLSX"
        />
        {outputBlob && (
          <button className="btn ghost" onClick={clear}>Limpar</button>
        )}
      </div>

      {preview.length > 0 && (
        <div>
          <span className="label">Preview — {rows.length} linha(s)</span>
          <DataTable headers={headers} rows={rows} />
        </div>
      )}
    </ToolLayout>
  )
}
