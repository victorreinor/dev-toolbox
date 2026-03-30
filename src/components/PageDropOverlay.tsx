import { createPortal } from 'react-dom'
import { Upload } from 'lucide-react'

interface PageDropOverlayProps {
  visible: boolean
  accept: string
}

export function PageDropOverlay({ visible, accept }: PageDropOverlayProps) {
  if (!visible) return null

  return createPortal(
    <div style={overlayStyle}>
      <div style={boxStyle}>
        <Upload size={32} color="var(--accent)" />
        <span style={textStyle}>Solte o arquivo aqui</span>
        <span style={hintStyle}>{accept}</span>
      </div>
    </div>,
    document.body
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 900,
  background: 'rgba(8, 8, 8, 0.85)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  animation: 'fadeIn 120ms ease both',
}

const boxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  padding: '40px 60px',
  border: '2px dashed var(--accent)',
  borderRadius: 4,
  background: 'var(--accent-dim)',
}

const textStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--accent)',
  letterSpacing: '-0.02em',
}

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
}
