import { Download } from 'lucide-react'

interface DownloadButtonProps {
  data: string | Blob | null
  filename: string
  mimeType?: string
  label?: string
  disabled?: boolean
}

export function DownloadButton({
  data,
  filename,
  mimeType = 'application/octet-stream',
  label = 'Baixar',
  disabled,
}: DownloadButtonProps) {
  const handleDownload = () => {
    if (!data) return
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      className="btn primary"
      onClick={handleDownload}
      disabled={disabled || !data}
    >
      <Download size={14} />
      {label}
    </button>
  )
}
