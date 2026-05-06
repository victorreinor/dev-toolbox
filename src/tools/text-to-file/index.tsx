import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Clipboard, Trash2, FileDown, Share2, Check, Link } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToast } from '../../components/Toast'
import { compressToBase64url, decompressFromBase64url } from '../../utils/compression'

const EXTENSIONS = [
  '.txt', '.md', '.json', '.csv', '.html', '.xml',
  '.yaml', '.yml', '.sql', '.log', '.ts', '.js',
  '.py', '.sh', '.env', '.toml', '.ini',
]

export default function TextToFile() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('arquivo')
  const [ext, setExt] = useState('.txt')
  const [customExt, setCustomExt] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [copiedButton, setCopiedButton] = useState<'share' | 'short' | null>(null)
  const [shortening, setShortening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current) }
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
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
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
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      toast('Link curto só funciona em produção (não em localhost)', 'error')
      return
    }
    try {
      setShortening(true)
      const longUrl = await buildShareUrl()
      const res = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`)
      const json = await res.json() as { shorturl?: string; errormessage?: string }
      if (!json.shorturl) throw new Error(json.errormessage ?? 'Erro desconhecido')
      await navigator.clipboard.writeText(json.shorturl)
      markCopied('short')
      toast('Link curto copiado!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao encurtar URL', 'error')
    } finally {
      setShortening(false)
    }
  }, [text, buildShareUrl, markCopied, toast])

  const lineCount = useMemo(() => text ? text.split('\n').length : 0, [text])
  const charCount = text.length

  return (
    <ToolLayout
      name="Texto → Arquivo"
      description="Cole um texto e baixe como arquivo com a extensão que quiser"
      badge="formatter"
    >
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
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Cole seu texto aqui (Ctrl+V) ou use o botão Colar abaixo…"
          spellCheck={false}
          style={{ flex: 1, minHeight: 320, padding: '16px 18px', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, border: 'none', outline: 'none', resize: 'none', overflowY: 'auto' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={handleDownload} disabled={!text}>
          <Download size={14} />
          Baixar {activeExt}
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
    </ToolLayout>
  )
}
