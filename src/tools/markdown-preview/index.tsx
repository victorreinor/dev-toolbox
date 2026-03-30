import { useState, useCallback, useMemo, useRef } from 'react'
import { marked } from 'marked'
import { AlignLeft, Columns2, Eye, Upload, Copy, Check, Trash2, FileText } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { DownloadButton } from '../../components/DownloadButton'
import { useToast } from '../../components/Toast'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

type ViewMode = 'editor' | 'split' | 'preview'

marked.setOptions({ gfm: true, breaks: true })

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

export default function MarkdownPreview() {
  const { toast } = useToast()
  const { copy, copied } = useCopyToClipboard()
  const [markdown, setMarkdown] = useState(SAMPLE)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setMarkdown(e.target?.result as string)
      setFileName(file.name)
      toast(`${file.name} carregado!`, 'success')
    }
    reader.readAsText(file, 'utf-8')
  }, [toast])

  const showEditor = viewMode !== 'preview'
  const showPreview = viewMode !== 'editor'

  return (
    <ToolLayout
      name="Markdown Preview"
      description="Edite, cole ou carregue markdown e visualize em tempo real"
      badge="formatter"
    >
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
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
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
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
