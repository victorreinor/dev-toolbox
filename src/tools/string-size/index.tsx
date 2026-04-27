import { useState, useMemo, useCallback } from 'react'
import { Copy, Check, AlertTriangle, CheckCircle, XCircle, Minimize2 } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { useToast } from '../../components/Toast'

interface ServiceLimit {
  name: string
  bytes: number
  description: string
}

const LIMITS: ServiceLimit[] = [
  { name: 'SQS', bytes: 256 * 1024, description: 'Corpo da mensagem' },
  { name: 'SNS', bytes: 256 * 1024, description: 'Corpo da mensagem' },
  { name: 'Lambda async', bytes: 256 * 1024, description: 'Payload do evento' },
  { name: 'EventBridge', bytes: 256 * 1024, description: 'Tamanho do evento' },
  { name: 'Lambda sync', bytes: 6 * 1024 * 1024, description: 'Request/response' },
  { name: 'API Gateway', bytes: 10 * 1024 * 1024, description: 'Body da requisição' },
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function getStatusColor(ratio: number): string {
  if (ratio <= 0.7) return 'var(--green, #22c55e)'
  if (ratio <= 0.9) return 'var(--yellow, #eab308)'
  return 'var(--red, #ef4444)'
}

function StatusIcon({ ratio }: { ratio: number }) {
  if (ratio <= 0.7) return <CheckCircle size={14} color="var(--green, #22c55e)" />
  if (ratio <= 0.9) return <AlertTriangle size={14} color="var(--yellow, #eab308)" />
  return <XCircle size={14} color="var(--red, #ef4444)" />
}

interface SizeInfo {
  bytes: number
  chars: number
  lines: number
  isMultiByte: boolean
  jsonMinifiedBytes: number | null
  jsonValid: boolean
}

function analyzeText(text: string): SizeInfo {
  const encoded = new TextEncoder().encode(text)
  const bytes = encoded.byteLength
  const chars = text.length
  const lines = text === '' ? 0 : text.split('\n').length
  const isMultiByte = bytes !== chars

  let jsonMinifiedBytes: number | null = null
  let jsonValid = false

  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      const minified = JSON.stringify(parsed)
      jsonMinifiedBytes = new TextEncoder().encode(minified).byteLength
      jsonValid = true
    } catch {
      jsonValid = false
    }
  }

  return { bytes, chars, lines, isMultiByte, jsonMinifiedBytes, jsonValid }
}

const PLACEHOLDER = `Cole aqui seu payload JSON, string ou qualquer texto para medir o tamanho...

{
  "userId": "abc-123",
  "event": "order_placed",
  "data": { "orderId": "xyz-789", "total": 99.90 }
}`

export default function StringSizeTool() {
  const [input, setInput] = useState('')
  const { copy, copied } = useCopyToClipboard()
  const { toast } = useToast()

  const info = useMemo(() => analyzeText(input), [input])

  const handleMinify = useCallback(() => {
    if (!info.jsonValid) {
      toast('JSON inválido para minificar', 'error')
      return
    }
    try {
      const minified = JSON.stringify(JSON.parse(input.trim()))
      setInput(minified)
    } catch {
      toast('Erro ao minificar', 'error')
    }
  }, [input, info.jsonValid, toast])

  const handlePrettify = useCallback(() => {
    if (!info.jsonValid) {
      toast('JSON inválido para formatar', 'error')
      return
    }
    try {
      const pretty = JSON.stringify(JSON.parse(input.trim()), null, 2)
      setInput(pretty)
    } catch {
      toast('Erro ao formatar', 'error')
    }
  }, [input, info.jsonValid, toast])

  const hasContent = input.length > 0

  return (
    <ToolLayout
      name="Tamanho de Payload"
      description="Meça o tamanho em bytes de qualquer string ou JSON e compare com os limites de serviços"
      badge="validator"
    >
      <div style={editorWrapStyle}>
        <textarea
          style={textareaStyle}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
        />

        <div style={metaBarStyle}>
          <span style={metaTextStyle}>
            {info.lines > 0 ? `${info.lines} linha${info.lines !== 1 ? 's' : ''} · ` : ''}
            {info.chars.toLocaleString('pt-BR')} caracteres
            {info.isMultiByte && ` · ${info.bytes.toLocaleString('pt-BR')} bytes (multi-byte)`}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {info.jsonValid && (
              <>
                <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={handleMinify}>
                  <Minimize2 size={11} /> Minificar
                </button>
                <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={handlePrettify}>
                  {'{ }'} Formatar
                </button>
              </>
            )}
            {hasContent && (
              <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setInput('')}>
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {hasContent && (
        <>
          <div style={sizeCardStyle}>
            <div style={mainSizeStyle}>{formatBytes(info.bytes)}</div>
            <div style={sizeSubStyle}>{info.bytes.toLocaleString('pt-BR')} bytes (UTF-8)</div>
            <button
              className="btn"
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
              onClick={() => copy(String(info.bytes))}
            >
              {copied ? <Check size={13} color="var(--accent)" /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar bytes'}
            </button>

            {info.jsonValid && info.jsonMinifiedBytes !== null && info.jsonMinifiedBytes !== info.bytes && (
              <div style={jsonSizeRowStyle}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Minificado: <strong style={{ color: 'var(--text)' }}>{formatBytes(info.jsonMinifiedBytes)}</strong>
                  {' '}
                  <span style={{ color: 'var(--text-muted)' }}>
                    ({info.jsonMinifiedBytes.toLocaleString('pt-BR')} bytes · economia de {formatBytes(info.bytes - info.jsonMinifiedBytes)})
                  </span>
                </span>
              </div>
            )}
          </div>

          <div>
            <span style={sectionLabelStyle}>Limites de serviços AWS</span>
            <div style={limitsGridStyle}>
              {LIMITS.map(limit => {
                const ratio = info.bytes / limit.bytes
                const over = ratio > 1
                const color = getStatusColor(ratio)
                const pct = Math.min(ratio * 100, 100)

                return (
                  <div key={limit.name} style={limitCardStyle}>
                    <div style={limitHeaderStyle}>
                      <StatusIcon ratio={ratio} />
                      <span style={limitNameStyle}>{limit.name}</span>
                      <span style={{ ...limitValueStyle, color: over ? 'var(--red, #ef4444)' : 'var(--text-muted)' }}>
                        {over
                          ? `+${formatBytes(info.bytes - limit.bytes)} acima`
                          : `${formatBytes(limit.bytes - info.bytes)} sobrando`}
                      </span>
                    </div>
                    <div style={progressTrackStyle}>
                      <div style={{ ...progressFillStyle, width: `${pct}%`, background: color }} />
                    </div>
                    <div style={limitFooterStyle}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{limit.description}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {formatBytes(info.bytes)} / {formatBytes(limit.bytes)}
                        {' '}({ratio >= 1 ? '≥100' : (ratio * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </ToolLayout>
  )
}

const editorWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
  background: 'var(--surface)',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 220,
  padding: '14px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  lineHeight: 1.6,
  color: 'var(--text)',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
}

const metaBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 12px',
  borderTop: '1px solid var(--border)',
  background: 'var(--bg)',
}

const metaTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
}

const sizeCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '20px 24px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
}

const mainSizeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 36,
  fontWeight: 700,
  color: 'var(--text)',
  letterSpacing: '-0.02em',
  lineHeight: 1,
}

const sizeSubStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-muted)',
}

const jsonSizeRowStyle: React.CSSProperties = {
  marginTop: 4,
  padding: '8px 12px',
  borderRadius: 6,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
}

const sectionLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 10,
}

const limitsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 10,
}

const limitCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '12px 14px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
}

const limitHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const limitNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text)',
  flex: 1,
}

const limitValueStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
}

const progressTrackStyle: React.CSSProperties = {
  height: 4,
  borderRadius: 2,
  background: 'var(--border)',
  overflow: 'hidden',
}

const progressFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 2,
  transition: 'width 150ms ease, background 150ms ease',
}

const limitFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}
