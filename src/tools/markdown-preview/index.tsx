import { useState, useCallback, useMemo, useRef } from 'react'
import { marked } from 'marked'
import { AlignLeft, Columns2, Eye, Upload, Copy, Check, Trash2, FileText, FileDown } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { DownloadButton } from '../../components/DownloadButton'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { usePageDrop } from '../../hooks/usePageDrop'

type ViewMode = 'editor' | 'split' | 'preview'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
}

const ACCEPT = ['.md', '.txt', '.markdown']

marked.setOptions({ gfm: true, breaks: true })
marked.use({
  renderer: {
    heading({ text, depth, tokens }) {
      const html = this.parser.parseInline(tokens)
      const id = slugify(text)
      return `<h${depth} id="${id}">${html}</h${depth}>\n`
    },
  },
})

const SAMPLE = `# Markdown Preview

Bem-vindo ao editor de markdown do **DevUtils**. Edite este texto para ver a prévia em tempo real.

## Funcionalidades

- ✏️ **Edite** markdown diretamente no painel esquerdo
- 📋 **Cole** um markdown existente
- 📂 **Carregue** arquivos \`.md\` ou \`.txt\` via upload ou arrastar
- 👁️ **Visualize** a prévia em tempo real

## Formatação suportada

**Negrito**, _itálico_, ~~tachado~~ e \`código inline\`.

### Blocos de código

\`\`\`typescript
interface User {
  id: number
  name: string
  email: string
}

const greet = (user: User) => \`Olá, \${user.name}!\`
\`\`\`

### Tabela

| Ferramenta | Categoria | Status |
|------------|-----------|--------|
| JSON → CSV | Converter | ✅ Ativo |
| CPF Gerador | Gerador | ✅ Ativo |
| Markdown | Formatter | ✅ Ativo |

### Citação

> "A simplicidade é a sofisticação máxima."
> — Leonardo da Vinci

---

Feito com ♥ no **DevUtils** — ferramentas de dev, sem servidor, sem frescura.
`

function buildPrintHTML(html: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: #24292e;
    padding: 40px 60px;
    max-width: 900px;
    margin: 0 auto;
  }
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
    color: #1a1a2e;
  }
  h1 { font-size: 2em; border-bottom: 2px solid #e1e4e8; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #e1e4e8; padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1em; }
  h5 { font-size: 0.875em; }
  h6 { font-size: 0.85em; color: #6a737d; }
  p { margin-bottom: 1em; }
  a { color: #0366d6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  strong { font-weight: 600; }
  em { font-style: italic; }
  del { text-decoration: line-through; }
  code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875em;
    background: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 3px;
    padding: 0.2em 0.4em;
    color: #e36209;
  }
  pre {
    background: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    padding: 16px;
    overflow: auto;
    margin-bottom: 1em;
    page-break-inside: avoid;
  }
  pre code {
    background: none;
    border: none;
    padding: 0;
    color: #24292e;
    font-size: 0.875em;
    line-height: 1.6;
  }
  blockquote {
    margin: 0 0 1em 0;
    padding: 0 1em;
    border-left: 4px solid #dfe2e5;
    color: #6a737d;
  }
  ul, ol { margin-bottom: 1em; padding-left: 2em; }
  li { margin-bottom: 0.25em; }
  li > ul, li > ol { margin-bottom: 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1em;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #dfe2e5;
    padding: 8px 12px;
    text-align: left;
  }
  th { background: #f6f8fa; font-weight: 600; }
  tr:nth-child(even) td { background: #fafbfc; }
  hr {
    border: none;
    border-top: 2px solid #e1e4e8;
    margin: 1.5em 0;
  }
  img { max-width: 100%; height: auto; }
  @page {
    margin: 1.5cm;
    @top-left { content: none; }
    @top-center { content: none; }
    @top-right { content: none; }
    @bottom-left { content: none; }
    @bottom-center { content: none; }
    @bottom-right {
      content: counter(page);
      font-family: -apple-system, sans-serif;
      font-size: 10px;
      color: #888;
    }
  }
  @media print {
    body { padding: 0; color: #000; }
    a { color: #0366d6; }
    pre, blockquote, table, figure { page-break-inside: avoid; }
    h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
  }
</style>
</head>
<body>
${html}
<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`
}

export default function MarkdownPreview() {
  const { toast } = useToast()
  const { copy, copied } = useCopyToClipboard()
  const [markdown, setMarkdown] = useState(SAMPLE)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const handleAnchorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const anchor = target.closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (!href?.startsWith('#')) return
    e.preventDefault()
    const id = href.slice(1)
    const el = previewRef.current?.querySelector(`#${CSS.escape(id)}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const { html, wordCount } = useMemo(() => {
    try {
      return {
        html: marked.parse(markdown) as string,
        wordCount: markdown.trim().split(/\s+/).filter(Boolean).length,
      }
    } catch {
      return { html: '<p>Erro ao renderizar markdown</p>', wordCount: 0 }
    }
  }, [markdown])

  const handleExportPDF = useCallback(() => {
    const title = fileName ? fileName.replace(/\.[^.]+$/, '') : 'documento'
    const printHTML = buildPrintHTML(html, title)
    const win = window.open('', '_blank')
    if (!win) {
      toast('Permita pop-ups para exportar PDF', 'error')
      return
    }
    win.document.write(printHTML)
    win.document.close()
  }, [html, fileName, toast])

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setMarkdown(e.target?.result as string)
      setFileName(file.name)
      toast(`${file.name} carregado!`, 'success')
    }
    reader.readAsText(file, 'utf-8')
  }, [toast])

  const { draggingOver } = usePageDrop({ accept: ACCEPT, onFile: handleFile })

  const showEditor = viewMode !== 'preview'
  const showPreview = viewMode !== 'editor'

  return (
    <ToolLayout
      name="Markdown Preview"
      description="Edite, cole ou carregue markdown e visualize em tempo real"
      badge="formatter"
    >
      <PageDropOverlay visible={draggingOver} accept=".md, .txt, .markdown" />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
          {(
            [
              { mode: 'editor' as ViewMode, Icon: AlignLeft, label: 'Editor' },
              { mode: 'split' as ViewMode, Icon: Columns2, label: 'Dividido' },
              { mode: 'preview' as ViewMode, Icon: Eye, label: 'Prévia' },
            ]
          ).map(({ mode, Icon, label }) => (
            <button
              key={mode}
              className={`btn${viewMode === mode ? ' primary' : ' ghost'}`}
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setViewMode(mode)}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {fileName && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <FileText size={11} />
            {fileName}
          </span>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.markdown"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />
        <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => fileInputRef.current?.click()}>
          <Upload size={13} /> Upload
        </button>
        <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => copy(markdown)} disabled={!markdown}>
          {copied ? <Check size={13} color="var(--accent)" /> : <Copy size={13} />}
          {copied ? 'Copiado!' : 'Copiar MD'}
        </button>
        <DownloadButton data={markdown || null} filename={fileName ?? 'documento.md'} mimeType="text/markdown" label="Baixar .md" />
        <button className="btn ghost" style={{ fontSize: 12 }} onClick={handleExportPDF} disabled={!markdown}>
          <FileDown size={13} /> PDF
        </button>
        <button
          className="btn ghost"
          style={{ padding: '6px 8px' }}
          onClick={() => { setMarkdown(''); setFileName(null) }}
          disabled={!markdown}
          title="Limpar"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Split pane */}
      <div
        style={{ flex: 1, minHeight: 0, display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}
      >
        {/* Editor pane */}
        {showEditor && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: showPreview ? '1px solid var(--border)' : 'none', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>MARKDOWN</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{markdown.length} chars</span>
            </div>
            <textarea
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
              placeholder="Cole ou escreva seu markdown aqui…"
              spellCheck={false}
              style={{ flex: 1, padding: '16px 18px', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, border: 'none', outline: 'none', resize: 'none', overflowY: 'auto' }}
            />
          </div>
        )}

        {/* Preview pane */}
        {showPreview && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: 'var(--bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>PRÉVIA</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                {wordCount} palavras
              </span>
            </div>
            <div
              ref={previewRef}
              className="markdown-body"
              onClick={handleAnchorClick}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
