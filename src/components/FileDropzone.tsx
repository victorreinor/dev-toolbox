import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { Upload, FileText, X } from 'lucide-react'

type DropzoneState = 'idle' | 'dragging' | 'processing' | 'done' | 'error'

interface FileDropzoneProps {
  accept: string
  maxMB?: number
  hint?: string
  onFile: (file: File) => void
  state?: DropzoneState
  fileName?: string
  onClear?: () => void
}

export function FileDropzone({
  accept,
  maxMB = 500,
  hint,
  onFile,
  state = 'idle',
  fileName,
  onClear,
}: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (maxMB && file.size > maxMB * 1024 * 1024) {
      alert(`Arquivo muito grande. Máximo: ${maxMB}MB`)
      return
    }
    onFile(file)
  }, [onFile, maxMB])

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const isDone = state === 'done'
  const isError = state === 'error'
  const isActive = dragging || state === 'dragging'

  if (isDone && fileName) {
    return (
      <div style={doneStyle}>
        <FileText size={16} color="var(--accent)" />
        <span className="mono" style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>
          {fileName}
        </span>
        {onClear && (
          <button onClick={onClear} className="btn ghost" style={{ padding: '4px 8px' }}>
            <X size={13} />
            Limpar
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      style={dropzoneStyle(isActive, isError)}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={onChange}
      />
      <Upload size={20} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: isActive ? 'var(--accent)' : 'var(--text)' }}>
          {isActive ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {hint || `${accept} · até ${maxMB}MB`}
        </p>
      </div>
    </div>
  )
}

function dropzoneStyle(active: boolean, error: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '32px 24px',
    border: `1px dashed ${error ? 'var(--error)' : active ? 'var(--accent)' : 'var(--border-2)'}`,
    borderRadius: 'var(--radius)',
    background: active ? 'var(--accent-dim)' : 'var(--surface)',
    cursor: 'pointer',
    transition: 'all var(--tr)',
    minHeight: 140,
  }
}

const doneStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  border: '1px solid var(--accent-border)',
  borderRadius: 'var(--radius)',
  background: 'var(--accent-dim)',
}
