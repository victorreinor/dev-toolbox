import type { ReactNode } from 'react'

interface ToolLayoutProps {
  name: string
  description: string
  badge?: string
  children: ReactNode
}

export function ToolLayout({ name, description, badge, children }: ToolLayoutProps) {
  return (
    <div style={wrapStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>{name}</h1>
          <p style={descStyle}>{description}</p>
        </div>
        {badge && <span className={`badge ${badge}`}>{badge}</span>}
      </header>
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  )
}

const wrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  animation: 'fadeIn 200ms ease both',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  padding: '24px 28px 20px',
  borderBottom: '1px solid var(--border)',
  gap: 16,
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--text)',
  marginBottom: 4,
  letterSpacing: '-0.02em',
}

const descStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-muted)',
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: '24px 28px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
}
