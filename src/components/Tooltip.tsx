import { useState } from 'react'

interface TooltipProps {
  shortcut?: string
  label?: string
  children: React.ReactNode
}

export function Tooltip({ shortcut, label, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  if (!shortcut && !label) return <>{children}</>
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius)',
          padding: '3px 8px',
          whiteSpace: 'nowrap',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          zIndex: 1000,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}>
          {label && <span>{label}</span>}
          {shortcut && (
            <kbd style={{
              fontSize: 10,
              padding: '1px 4px',
              border: '1px solid var(--border-2)',
              borderRadius: 2,
              color: 'var(--text-dim)',
              background: 'var(--surface)',
              fontFamily: 'var(--font-mono)',
            }}>
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  )
}
