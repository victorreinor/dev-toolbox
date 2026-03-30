import { Copy, Check } from 'lucide-react'
import { DownloadButton } from './DownloadButton'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'

interface OutputActionsProps {
  data: string | null
  filename: string
  mimeType: string
  onClear?: () => void
}

export function OutputActions({ data, filename, mimeType, onClear }: OutputActionsProps) {
  const { copy, copied } = useCopyToClipboard()

  if (!data) return null

  return (
    <>
      <button className="btn" onClick={() => copy(data)}>
        {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
      <DownloadButton data={data} filename={filename} mimeType={mimeType} />
      {onClear && (
        <button className="btn ghost" onClick={onClear}>Limpar</button>
      )}
    </>
  )
}
