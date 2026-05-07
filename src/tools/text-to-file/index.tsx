import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Clipboard, Trash2, FileDown, Share2, Check, Link, Save, Clock, CornerDownLeft, Search } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToast } from '../../components/Toast'
import { compressToBase64url, decompressFromBase64url } from '../../utils/compression'
import { shortenUrl, isLocalhost } from '../../utils/urlShortener'
import { useTextHistory, type HistoryEntry } from './useTextHistory'

const EXTENSIONS = [
  '.txt', '.md', '.json', '.csv', '.html', '.xml',
  '.yaml', '.yml', '.sql', '.log', '.ts', '.js',
  '.py', '.sh', '.env', '.toml', '.ini',
]

function formatDate(ts: number) {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function tabStyle(isActive: boolean): React.CSSProperties {
  return {
    padding: '7px 16px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    background: 'none',
    border: 'none',
    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
    cursor: 'pointer',
    letterSpacing: '0.05em',
    transition: 'color 0.15s',
  }
}

export default function TextToFile() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor')
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('arquivo')
  const [ext, setExt] = useState('.txt')
  const [customExt, setCustomExt] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [currentLine, setCurrentLine] = useState(1)
  const [copiedButton, setCopiedButton] = useState<'share' | 'short' | null>(null)
  const [shortening, setShortening] = useState(false)
  const [savedFile, setSavedFile] = useState(false)
  const [search, setSearch] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { entries, loading, save, remove } = useTextHistory()
  const filteredEntries = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return entries
    return entries.filter(e => `${e.filename}${e.ext}`.toLowerCase().includes(q) || e.text.toLowerCase().includes(q))
  }, [search, entries])

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const t = searchParams.get('t')
    if (!t) return
    decompressFromBase64url(t)
      .then(decoded => {
        setText(decoded)
        const name = searchParams.get('name')
        const e = searchParams.get('ext')
        if (name) setFilename(name)
        if (e) {
          if (EXTENSIONS.includes(e)) {
            setExt(e)
          } else {
            setUseCustom(true)
            setCustomExt(e)
          }
        }
      })
      .catch(() => toast('Link inválido ou corrompido', 'error'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeExt = useCustom ? (customExt.startsWith('.') ? customExt : `.${customExt}`) || '.txt' : ext
  const fullFilename = `${filename || 'arquivo'}${activeExt}`

  const buildShareUrl = useCallback(async () => {
    const encoded = await compressToBase64url(text)
    const params = new URLSearchParams({ t: encoded, name: filename || 'arquivo', ext: activeExt })
    return `${window.location.origin}/tools/text-to-file?${params.toString()}`
  }, [text, filename, activeExt])

  const markCopied = useCallback((button: 'share' | 'short') => {
    clearTimeout(copiedTimeoutRef.current ?? undefined)
    setCopiedButton(button)
    copiedTimeoutRef.current = setTimeout(() => setCopiedButton(null), 2000)
  }, [])

  const handleDownload = useCallback(() => {
    if (!text) { toast('Cole algum texto antes de baixar', 'error'); return }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fullFilename
    a.click()
    URL.revokeObjectURL(url)
    toast(`${fullFilename} baixado!`, 'success')
  }, [text, fullFilename, toast])

  const handlePaste = useCallback(async () => {
    try {
      const clipText = await navigator.clipboard.readText()
      setText(clipText)
      textareaRef.current?.focus()
      toast('Texto colado!', 'success')
    } catch {
      toast('Permita acesso à área de transferência', 'error')
    }
  }, [toast])

  const handleShare = useCallback(async () => {
    if (!text) { toast('Cole algum texto antes de compartilhar', 'error'); return }
    try {
      const url = await buildShareUrl()
      await navigator.clipboard.writeText(url)
      markCopied('share')
      toast('Link copiado!', 'success')
    } catch {
      toast('Erro ao gerar link', 'error')
    }
  }, [text, buildShareUrl, markCopied, toast])

  const handleShareShort = useCallback(async () => {
    if (!text) { toast('Cole algum texto antes de compartilhar', 'error'); return }
    if (isLocalhost()) {
      toast('Link curto só funciona em produção (não em localhost)', 'error')
      return
    }
    try {
      setShortening(true)
      const longUrl = await buildShareUrl()
      const short = await shortenUrl(longUrl)
      await navigator.clipboard.writeText(short)
      markCopied('short')
      toast('Link curto copiado!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao encurtar URL', 'error')
    } finally {
      setShortening(false)
    }
  }, [text, buildShareUrl, markCopied, toast])

  const handleSave = useCallback(async () => {
    if (!text) { toast('Nenhum texto para salvar', 'error'); return }
    await save({ filename: filename || 'arquivo', ext: activeExt, text })
    setSavedFile(true)
    clearTimeout(savedTimeoutRef.current ?? undefined)
    savedTimeoutRef.current = setTimeout(() => setSavedFile(false), 2000)
  }, [text, filename, activeExt, save])

  const handleLoadEntry = useCallback((entry: HistoryEntry) => {
    setText(entry.text)
    setFilename(entry.filename)
    if (EXTENSIONS.includes(entry.ext)) {
      setExt(entry.ext)
      setUseCustom(false)
    } else {
      setUseCustom(true)
      setCustomExt(entry.ext)
    }
    setActiveTab('editor')
    toast(`"${entry.filename}${entry.ext}" carregado`, 'success')
  }, [toast])

  const updateCurrentLine = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    const line = ta.value.substring(0, ta.selectionStart).split('\n').length
    setCurrentLine(prev => prev === line ? prev : line)
  }, [])

  const lineCount = useMemo(() => text ? text.split('\n').length : 0, [text])
  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1),
    [lineCount]
  )
  const charCount = text.length

  return (
    <ToolLayout
      name="Texto → Arquivo"
      description="Cole um texto e baixe como arquivo com a extensão que quiser"
      badge="formatter"
    >
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        <button onClick={() => setActiveTab('editor')} style={tabStyle(activeTab === 'editor')}>
          EDITOR
        </button>
        <button onClick={() => setActiveTab('history')} style={{ ...tabStyle(activeTab === 'history'), display: 'flex', alignItems: 'center', gap: 6 }}>
          SALVO
          {entries.length > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
              {entries.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'editor' && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: '1 1 200px', minWidth: 0 }}>
              <span style={{ padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: 'var(--radius) 0 0 var(--radius)', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                Nome
              </span>
              <input
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder="arquivo"
                style={{ flex: 1, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: 0, fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text)', outline: 'none', minWidth: 0 }}
              />
              {useCustom ? (
                <input
                  type="text"
                  value={customExt}
                  onChange={e => setCustomExt(e.target.value)}
                  placeholder=".ext"
                  style={{ width: 80, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 var(--radius) var(--radius) 0', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent)', outline: 'none' }}
                />
              ) : (
                <select
                  value={ext}
                  onChange={e => setExt(e.target.value)}
                  style={{ padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 var(--radius) var(--radius) 0', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent)', cursor: 'pointer', outline: 'none' }}
                >
                  {EXTENSIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              )}
            </div>

            <label className="checkbox-label" style={{ fontSize: 12 }}>
              <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)} />
              Extensão personalizada
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <FileDown size={11} />
              {fullFilename}
            </div>
          </div>

          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>TEXTO</span>
              {text && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                  {lineCount} {lineCount === 1 ? 'linha' : 'linhas'} · {charCount} chars
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div
                ref={lineNumbersRef}
                style={{
                  overflowY: 'hidden',
                  overflowX: 'hidden',
                  userSelect: 'none',
                  background: 'var(--surface-2)',
                  borderRight: '1px solid var(--border)',
                  paddingTop: 16,
                  paddingBottom: 16,
                  paddingLeft: 8,
                  paddingRight: 8,
                  flexShrink: 0,
                  width: `${String(Math.max(lineCount, 1)).length * 8 + 24}px`,
                  textAlign: 'right',
                }}
              >
                {lineNumbers.map(n => (
                  <div key={n} style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, color: n === currentLine ? 'var(--accent)' : 'var(--text-dim)', fontWeight: n === currentLine ? 700 : 400, whiteSpace: 'nowrap' }}>
                    {n}
                  </div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => { setText(e.target.value); updateCurrentLine() }}
                onSelect={updateCurrentLine}
                onScroll={e => { if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop }}
                wrap="off"
                placeholder="Cole seu texto aqui (Ctrl+V) ou use o botão Colar abaixo…"
                spellCheck={false}
                style={{ flex: 1, minHeight: 320, padding: '16px 18px', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, border: 'none', outline: 'none', resize: 'none', overflowY: 'auto', overflowX: 'auto' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={handleDownload} disabled={!text}>
              <Download size={14} />
              Baixar {activeExt}
            </button>
            <button className="btn ghost" onClick={handleSave} disabled={!text} title="Salvar no histórico local">
              {savedFile ? <Check size={14} color="var(--accent)" /> : <Save size={14} />}
              {savedFile ? 'Salvo!' : 'Salvar'}
            </button>
            <button className="btn ghost" onClick={handleShare} disabled={!text}>
              {copiedButton === 'share' ? <Check size={14} color="var(--accent)" /> : <Share2 size={14} />}
              {copiedButton === 'share' ? 'Link copiado!' : 'Compartilhar'}
            </button>
            <button className="btn ghost" onClick={handleShareShort} disabled={!text || shortening}>
              {copiedButton === 'short' ? <Check size={14} color="var(--accent)" /> : <Link size={14} />}
              {shortening ? 'Encurtando…' : copiedButton === 'short' ? 'Copiado!' : 'Link curto'}
            </button>
            <button className="btn ghost" onClick={handlePaste}>
              <Clipboard size={14} />
              Colar do clipboard
            </button>
            <button
              className="btn ghost"
              onClick={() => setText('')}
              disabled={!text}
              title="Limpar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!loading && entries.length > 0 && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                className="input"
                style={{ paddingLeft: 30, fontSize: 12 }}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar pelo nome ou conteúdo…"
              />
            </div>
          )}
          {loading && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>
              Carregando…
            </div>
          )}
          {!loading && entries.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 0', color: 'var(--text-muted)' }}>
              <Clock size={28} strokeWidth={1.5} />
              <span style={{ fontSize: 13 }}>Nenhum arquivo salvo ainda.</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Use o botão "Salvar" no editor para guardar um texto aqui.</span>
            </div>
          )}
          {!loading && entries.length > 0 && filteredEntries.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 0', color: 'var(--text-muted)' }}>
              <Search size={24} strokeWidth={1.5} />
              <span style={{ fontSize: 13 }}>Nenhum resultado para "{search}"</span>
            </div>
          )}
          {!loading && filteredEntries.map(entry => {
            const entryLines = entry.text.split('\n').length
            return <div
              key={entry.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <FileDown size={12} color="var(--accent)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.filename}{entry.ext}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    · {formatDate(entry.savedAt)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    className="btn ghost"
                    onClick={() => handleLoadEntry(entry)}
                    title="Carregar no editor"
                    style={{ padding: '3px 8px', fontSize: 11, gap: 4 }}
                  >
                    <CornerDownLeft size={12} />
                    Carregar
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => remove(entry.id)}
                    title="Excluir"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 72, overflow: 'hidden' }}>
                {entry.text.slice(0, 200)}{entry.text.length > 200 ? '…' : ''}
              </div>
              <div style={{ padding: '4px 14px 8px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                {entryLines} {entryLines === 1 ? 'linha' : 'linhas'} · {entry.text.length} chars
              </div>
            </div>
          })}
        </div>
      )}
    </ToolLayout>
  )
}
