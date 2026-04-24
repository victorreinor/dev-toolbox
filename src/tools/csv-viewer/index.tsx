import { useState, useRef, useCallback, useMemo } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { CodeEditor } from '../../components/CodeEditor'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { usePageDrop } from '../../hooks/usePageDrop'
import { useWorker } from '../../hooks/useWorker'
import { DELIMITERS_WITH_AUTO } from '../../constants/delimiters'
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

type InputMode = 'file' | 'text'
type SortDir = 'asc' | 'desc'

interface ParseResponse {
  ok: boolean
  data?: unknown[]
  meta?: { delimiter?: string }
  error?: string
}

interface ParseRequest {
  type: 'parse'
  text: string
  options: { header: boolean; inferTypes: boolean; delimiter: string }
}

const ROW_H = 30
const CONTAINER_H = 480
const OVERSCAN = 25

function SortIcon({ col, sort }: { col: number; sort: { col: number; dir: SortDir } | null }) {
  if (sort?.col !== col) return <ArrowUpDown size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />
  return sort.dir === 'asc'
    ? <ArrowUp size={10} color="var(--accent)" style={{ flexShrink: 0 }} />
    : <ArrowDown size={10} color="var(--accent)" style={{ flexShrink: 0 }} />
}

export default function CsvViewer() {
  const { toast } = useToast()
  const [mode, setMode] = useState<InputMode>('file')
  const [csvText, setCsvText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileTextCache = useRef<string | null>(null)
  const [delimiter, setDelimiter] = useState('')
  const [hasHeader, setHasHeader] = useState(true)
  const [inferTypes, setInferTypes] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [allRows, setAllRows] = useState<unknown[][]>([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ col: number; dir: SortDir } | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Snapshot of hasHeader at parse time — avoids header/row split diverging if
  // the user toggles the checkbox while the worker is still running.
  const parseOptsRef = useRef({ hasHeader: true })

  const { post } = useWorker<ParseRequest, ParseResponse>(
    () => new Worker(new URL('../../workers/csvParser.worker.ts', import.meta.url), { type: 'module' }),
    {
      onMessage(res) {
        setParsing(false)
        if (!res.ok) { toast(res.error ?? 'Erro ao parsear CSV', 'error'); return }
        const raw = res.data as unknown[][]
        if (parseOptsRef.current.hasHeader && raw.length > 0) {
          setHeaders(raw[0].map(String))
          setAllRows(raw.slice(1))
          toast(`${(raw.length - 1).toLocaleString()} linhas carregadas`, 'success')
        } else {
          setHeaders([])
          setAllRows(raw)
          toast(`${raw.length.toLocaleString()} linhas carregadas`, 'success')
        }
      },
      onError(e) {
        setParsing(false)
        toast(e.message, 'error')
      },
    }
  )

  const runParse = useCallback((text: string) => {
    if (!text.trim()) { toast('Nenhum dado para visualizar', 'error'); return }
    parseOptsRef.current = { hasHeader }
    setParsing(true)
    setSearch('')
    setSort(null)
    setScrollTop(0)
    if (containerRef.current) containerRef.current.scrollTop = 0
    post({ type: 'parse', text, options: { header: false, inferTypes, delimiter } })
  }, [post, hasHeader, inferTypes, delimiter, toast])

  const handleFile = useCallback((f: File) => {
    setMode('file')
    setFile(f)
    setAllRows([])
    setHeaders([])
    fileTextCache.current = null
  }, [])

  const { draggingOver } = usePageDrop({ accept: ['.csv', '.txt'], onFile: handleFile })

  const handleVisualize = async () => {
    if (mode === 'file') {
      if (!file) { toast('Nenhum arquivo selecionado', 'error'); return }
      const text = fileTextCache.current ?? await file.text()
      fileTextCache.current = text
      runParse(text)
    } else {
      runParse(csvText)
    }
  }

  const filteredRows = useMemo(() => {
    if (!search.trim()) return allRows
    const q = search.toLowerCase()
    return allRows.filter(row => row.some(cell => String(cell ?? '').toLowerCase().includes(q)))
  }, [allRows, search])

  const displayRows = useMemo(() => {
    if (!sort) return filteredRows
    const { col, dir } = sort
    return [...filteredRows].sort((a, b) => {
      const av = a[col], bv = b[col]
      const an = Number(av), bn = Number(bv)
      const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : String(av ?? '').localeCompare(String(bv ?? ''))
      return dir === 'asc' ? cmp : -cmp
    })
  }, [filteredRows, sort])

  const displayHeaders = useMemo(() => {
    if (headers.length > 0) return headers
    const count = allRows[0]?.length ?? 0
    return Array.from({ length: count }, (_, i) => `col${i + 1}`)
  }, [headers, allRows])

  const visStart = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const visEnd = Math.min(displayRows.length, Math.ceil((scrollTop + CONTAINER_H) / ROW_H) + OVERSCAN)
  const paddingTop = visStart * ROW_H
  const paddingBottom = Math.max(0, (displayRows.length - visEnd) * ROW_H)

  const toggleSort = (colIdx: number) => {
    setSort(prev => {
      if (prev?.col === colIdx) return prev.dir === 'asc' ? { col: colIdx, dir: 'desc' } : null
      return { col: colIdx, dir: 'asc' }
    })
  }

  const hasData = allRows.length > 0 || (!parsing && headers.length > 0)

  const resetData = () => {
    setFile(null)
    fileTextCache.current = null
    setAllRows([])
    setHeaders([])
  }

  const resetScroll = () => {
    setScrollTop(0)
    if (containerRef.current) containerRef.current.scrollTop = 0
  }

  return (
    <ToolLayout name="CSV Viewer" description="Visualize e explore arquivos CSV com rolagem virtual para grandes volumes" badge="formatter">
      <PageDropOverlay visible={draggingOver} accept=".csv, .txt" />

      <div style={{ display: 'flex', gap: 8 }}>
        {(['file', 'text'] as InputMode[]).map(m => (
          <button key={m} className={`btn ${mode === m ? 'primary' : 'ghost'}`} onClick={() => setMode(m)}>
            {m === 'file' ? 'Upload arquivo' : 'Colar CSV'}
          </button>
        ))}
      </div>

      {mode === 'file' ? (
        <FileDropzone
          accept=".csv,.txt"
          hint=".csv ou .txt · até 500MB"
          onFile={handleFile}
          state={file ? 'done' : 'idle'}
          fileName={file?.name}
          onClear={resetData}
        />
      ) : (
        <CodeEditor
          value={csvText}
          onChange={setCsvText}
          placeholder="id,nome,cidade&#10;1,Ana,São Paulo&#10;2,Bob,Rio de Janeiro"
          label="CSV"
          minHeight={160}
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
          <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} />
          Primeira linha como cabeçalho
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={inferTypes} onChange={e => setInferTypes(e.target.checked)} />
          Inferir tipos
        </label>
      </div>

      <button className="btn primary" onClick={handleVisualize} disabled={parsing}>
        {parsing ? <><span className="spinner" />Parseando...</> : 'Visualizar'}
      </button>

      {hasData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fadeIn 200ms ease both' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="text-sm text-muted mono">
              {allRows.length.toLocaleString()} linhas · {displayHeaders.length} colunas
              {search.trim() && ` · ${filteredRows.length.toLocaleString()} filtradas`}
            </span>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                className="input"
                style={{ paddingLeft: 30, fontSize: 13 }}
                placeholder="Filtrar linhas..."
                value={search}
                onChange={e => { setSearch(e.target.value); resetScroll() }}
              />
            </div>
          </div>

          <div
            ref={containerRef}
            style={{ overflowX: 'auto', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', height: CONTAINER_H }}
            onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 52, textAlign: 'right', color: 'var(--text-dim)', cursor: 'default' }}>#</th>
                  {displayHeaders.map((h, i) => (
                    <th key={i} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none', minWidth: 100 }} onClick={() => toggleSort(i)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</span>
                        <SortIcon col={i} sort={sort} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={displayHeaders.length + 1} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      Nenhuma linha encontrada
                    </td>
                  </tr>
                ) : (
                  <>
                    {paddingTop > 0 && <tr style={{ height: paddingTop }}><td colSpan={displayHeaders.length + 1} /></tr>}
                    {displayRows.slice(visStart, visEnd).map((row, ri) => (
                      <tr key={visStart + ri}>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-dim)', width: 52, paddingRight: 12 }}>
                          {(visStart + ri + 1).toLocaleString()}
                        </td>
                        {displayHeaders.map((_, ci) => {
                          const cell = String(row[ci] ?? '')
                          return <td key={ci} style={tdStyle} title={cell}>{cell}</td>
                        })}
                      </tr>
                    ))}
                    {paddingBottom > 0 && <tr style={{ height: paddingBottom }}><td colSpan={displayHeaders.length + 1} /></tr>}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {displayRows.length > 50 && (
            <p className="text-xs text-muted" style={{ textAlign: 'right' }}>
              Rolagem virtual ativa — {displayRows.length.toLocaleString()} linhas totais
            </p>
          )}
        </div>
      )}
    </ToolLayout>
  )
}

const thStyle: React.CSSProperties = {
  padding: '6px 10px',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-muted)',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  background: 'var(--surface)',
  position: 'sticky',
  top: 0,
  zIndex: 1,
}

const tdStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text)',
  maxWidth: 240,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  height: ROW_H,
}
