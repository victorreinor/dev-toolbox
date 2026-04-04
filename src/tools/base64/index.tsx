import { useState, useEffect, useRef } from 'react'
import { Copy, Check } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { CodeEditor } from '../../components/CodeEditor'
import { DownloadButton } from '../../components/DownloadButton'
import { useToast } from '../../components/Toast'
import { useWorker } from '../../hooks/useWorker'
import { useFileStream } from '../../hooks/useFileStream'
import { usePageDrop } from '../../hooks/usePageDrop'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

type WorkerRequest =
  | { type: 'encode-start'; mimeType: string }
  | { type: 'encode-chunk'; data: ArrayBuffer }
  | { type: 'encode-end' }
  | { type: 'decode'; input: string }

interface WorkerResponse {
  ok: boolean
  opType?: 'encode' | 'decode'
  base64?: string
  dataUrl?: string
  mimeType?: string
  isImage?: boolean
  buffer?: ArrayBuffer
  error?: string
}

interface EncodeResult {
  base64: string
  dataUrl: string
  mimeType: string
  isImage: boolean
}

interface DecodeResult {
  blob: Blob
  mimeType: string
  isImage: boolean
  previewUrl: string
}

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/html': 'html',
  'text/css': 'css',
  'application/json': 'json',
  'application/zip': 'zip',
}

function getExtension(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? 'bin'
}

export default function Base64Tool() {
  const { toast } = useToast()
  const { copy, copied } = useCopyToClipboard()
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [processing, setProcessing] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [encodeResult, setEncodeResult] = useState<EncodeResult | null>(null)

  const [decodeInput, setDecodeInput] = useState('')
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null)

  const prevPreviewUrl = useRef<string | null>(null)
  const pendingFile = useRef<File | null>(null)

  const { post } = useWorker<WorkerRequest, WorkerResponse>(
    () => new Worker(new URL('../../workers/base64.worker.ts', import.meta.url), { type: 'module' }),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) {
          toast(res.error ?? 'Erro ao processar', 'error')
          return
        }

        if (res.opType === 'encode') {
          setEncodeResult({
            base64: res.base64!,
            dataUrl: res.dataUrl!,
            mimeType: res.mimeType!,
            isImage: res.isImage ?? false,
          })
          toast('Encode concluído!', 'success')
        } else {
          if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current)
          const mimeType = res.mimeType ?? 'application/octet-stream'
          const blob = new Blob([res.buffer!], { type: mimeType })
          const previewUrl = res.isImage ? URL.createObjectURL(blob) : ''
          prevPreviewUrl.current = previewUrl || null
          setDecodeResult({
            blob,
            mimeType,
            isImage: res.isImage ?? false,
            previewUrl,
          })
          toast('Decode concluído!', 'success')
        }
      },
      onError: () => {
        setProcessing(false)
        toast('Erro inesperado no worker', 'error')
      },
    }
  )

  useEffect(() => {
    return () => {
      if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current)
    }
  }, [])

  const { read: streamRead, progress: streamProgress } = useFileStream({
    onChunk: (chunk) => {
      post({ type: 'encode-chunk', data: chunk })
    },
    onComplete: () => {
      post({ type: 'encode-end' })
    },
    onError: () => {
      setProcessing(false)
      toast('Erro ao ler o arquivo', 'error')
    },
  })

  const handleFile = (f: File) => {
    setFile(f)
    setEncodeResult(null)
    pendingFile.current = f
    setProcessing(true)
    post({ type: 'encode-start', mimeType: f.type || 'application/octet-stream' })
    streamRead(f)
  }

  const { draggingOver } = usePageDrop({
    accept: ['*'],
    onFile: handleFile,
    disabled: mode !== 'encode',
  })

  const handleDecode = () => {
    if (!decodeInput.trim()) {
      toast('Cole o Base64 para decodificar', 'error')
      return
    }
    setDecodeResult(null)
    setProcessing(true)
    post({ type: 'decode', input: decodeInput })
  }

  const handleClear = () => {
    setFile(null)
    setEncodeResult(null)
    setDecodeInput('')
    setDecodeResult(null)
  }

  const switchMode = (next: 'encode' | 'decode') => {
    setMode(next)
    handleClear()
  }

  return (
    <ToolLayout
      name="Base64"
      description="Codifique arquivos e imagens em Base64 ou decodifique strings Base64 de volta ao arquivo original"
      badge="converter"
    >
      <PageDropOverlay visible={draggingOver} accept="qualquer arquivo" />

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className={`btn${mode === 'encode' ? ' primary' : ''}`}
          onClick={() => switchMode('encode')}
        >
          Encode
        </button>
        <button
          className={`btn${mode === 'decode' ? ' primary' : ''}`}
          onClick={() => switchMode('decode')}
        >
          Decode
        </button>
      </div>

      {mode === 'encode' ? (
        <>
          <FileDropzone
            accept="*"
            hint="Qualquer arquivo · até 50MB"
            maxMB={50}
            onFile={handleFile}
            state={processing ? 'processing' : file ? 'done' : 'idle'}
            fileName={processing && streamProgress < 100
              ? `Lendo… ${streamProgress}%`
              : file?.name}
            onClear={handleClear}
          />

          {encodeResult && (
            <>
              {encodeResult.isImage && (
                <div style={previewBoxStyle}>
                  <span style={labelStyle}>Pré-visualização</span>
                  <img src={encodeResult.dataUrl} alt="Preview" style={imgStyle} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => copy(encodeResult.base64)}>
                  {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar Base64'}
                </button>
                <button className="btn" onClick={() => copy(encodeResult.dataUrl)}>
                  <Copy size={14} />
                  Copiar Data URL
                </button>
                <DownloadButton
                  data={encodeResult.base64}
                  filename={`${file?.name ?? 'encoded'}.b64.txt`}
                  mimeType="text/plain"
                  label="Baixar .txt"
                />
              </div>

              <CodeEditor
                value={encodeResult.base64}
                readOnly
                label={`Base64 · ${encodeResult.mimeType}`}
                minHeight={180}
              />
            </>
          )}
        </>
      ) : (
        <>
          <CodeEditor
            value={decodeInput}
            onChange={setDecodeInput}
            label="Base64 ou Data URL"
            placeholder={'Cole aqui o Base64 ou Data URL:\n\ndata:image/png;base64,iVBORw0KGgo...\nou\niVBORw0KGgo...'}
            minHeight={180}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn primary"
              onClick={handleDecode}
              disabled={processing}
            >
              {processing && <span className="spinner" />}
              {processing ? 'Decodificando…' : 'Decodificar'}
            </button>
            {decodeResult && (
              <button className="btn ghost" onClick={handleClear}>Limpar</button>
            )}
          </div>

          {decodeResult && (
            <>
              {decodeResult.isImage ? (
                <div style={previewBoxStyle}>
                  <span style={labelStyle}>Resultado · {decodeResult.mimeType}</span>
                  <img src={decodeResult.previewUrl} alt="Decoded" style={imgStyle} />
                </div>
              ) : (
                <div style={infoBoxStyle}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Arquivo decodificado · {decodeResult.mimeType}
                  </span>
                </div>
              )}

              <DownloadButton
                data={decodeResult.blob}
                filename={`decoded.${getExtension(decodeResult.mimeType)}`}
                mimeType={decodeResult.mimeType}
                label="Baixar arquivo"
              />
            </>
          )}
        </>
      )}
    </ToolLayout>
  )
}

const previewBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 16,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
  fontWeight: 500,
}

const imgStyle: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: 400,
  objectFit: 'contain',
  borderRadius: 4,
}

const infoBoxStyle: React.CSSProperties = {
  padding: '12px 16px',
  border: '1px solid var(--accent-border)',
  borderRadius: 'var(--radius)',
  background: 'var(--accent-dim)',
}
