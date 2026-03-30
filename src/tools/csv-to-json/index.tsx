import { useState, useRef, useCallback } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { CodeEditor } from '../../components/CodeEditor'
import { OutputActions } from '../../components/OutputActions'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { usePageDrop } from '../../hooks/usePageDrop'
import { DELIMITERS_WITH_AUTO } from '../../constants/delimiters'
import Papa from 'papaparse'

type InputMode = 'file' | 'text'

export default function CsvToJson() {
  const { toast } = useToast()
  const [mode, setMode] = useState<InputMode>('text')
  const [csvText, setCsvText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileTextCache = useRef<string | null>(null)
  const [delimiter, setDelimiter] = useState('')
  const [header, setHeader] = useState(true)
  const [inferTypes, setInferTypes] = useState(true)
  const [jsonOutput, setJsonOutput] = useState('')

  const handleFile = useCallback((f: File) => {
    setMode('file')
    setFile(f)
    setJsonOutput('')
    fileTextCache.current = null
    // Cache file content eagerly so convert() doesn't re-read on every click
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

    const result = Papa.parse(text, {
      header,
      delimiter: delimiter || undefined,
      dynamicTyping: inferTypes,
      skipEmptyLines: true,
    })
    setJsonOutput(JSON.stringify(result.data, null, 2))
    toast(`${result.data.length} linha(s) convertida(s)!`, 'success')
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
          state={file ? 'done' : 'idle'}
          fileName={file?.name}
          onClear={() => { setFile(null); fileTextCache.current = null; setJsonOutput('') }}
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
        <button className="btn primary" onClick={convert}>Converter</button>
        <OutputActions
          data={jsonOutput}
          filename="output.json"
          mimeType="application/json"
          onClear={() => setJsonOutput('')}
        />
      </div>

      {jsonOutput && <CodeEditor value={jsonOutput} readOnly label="JSON" minHeight={220} />}
    </ToolLayout>
  )
}
