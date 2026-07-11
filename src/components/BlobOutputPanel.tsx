import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { CodeEditor } from './CodeEditor'
import { DownloadButton } from './DownloadButton'
import { useToast } from './Toast'

// Copying more than this to the clipboard is impractical (and can hang the tab),
// so for large outputs we hide Copy and steer the user to Download instead.
const COPY_LIMIT_BYTES = 2 * 1024 * 1024

interface BlobOutputPanelProps {
  preview: string
  previewTruncated: boolean
  blob: Blob | null
  filename: string
  label?: string
  onClear?: () => void
}

/**
 * Output panel for tools whose result can be file-scale (JSON, SQL, …).
 *
 * The full output string never lives on the main thread: the worker hands us a Blob
 * (downloaded directly) plus a short text preview (the only thing shown in the
 * editor). This keeps both the giant-string copy and the line-by-line DOM render
 * off the UI thread.
 */
export function BlobOutputPanel({
  preview,
  previewTruncated,
  blob,
  filename,
  label = 'JSON',
  onClear,
}: BlobOutputPanelProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  if (!blob) return null

  const canCopy = blob.size <= COPY_LIMIT_BYTES

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(await blob.text())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast('Falha ao copiar', 'error')
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        {canCopy && (
          <button className="btn" onClick={handleCopy}>
            {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        )}
        <DownloadButton data={blob} filename={filename} />
        {onClear && <button className="btn ghost" onClick={onClear}>Limpar</button>}
      </div>

      {previewTruncated && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
          Mostrando apenas as primeiras linhas. Use <strong>Baixar</strong> para o conteúdo completo.
        </p>
      )}

      <CodeEditor value={preview} readOnly label={label} minHeight={240} />
    </>
  )
}
