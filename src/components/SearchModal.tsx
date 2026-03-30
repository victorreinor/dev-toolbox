import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import { searchTools } from '../registry'
import type { ToolMeta } from '../types'

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const results = searchTools(query)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setActive(0) }, [query])

  const select = useCallback((tool: ToolMeta) => {
    navigate(`/tools/${tool.id}`)
    onClose()
  }, [navigate, onClose])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && results[active]) select(results[active])
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div style={searchBoxStyle}>
          <Search size={15} color="var(--text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar ferramenta…"
            style={inputStyle}
          />
          <kbd style={kbdStyle}>ESC</kbd>
        </div>
        <div className="divider" />
        <div style={listStyle}>
          {results.length === 0 ? (
            <div style={emptyStyle}>Nenhuma ferramenta encontrada</div>
          ) : results.map((tool, i) => (
            <button
              key={tool.id}
              style={itemStyle(i === active)}
              onClick={() => select(tool)}
              onMouseEnter={() => setActive(i)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, textAlign: 'left' }}>
                <span className="mono" style={{ fontSize: 13, color: i === active ? 'var(--accent)' : 'var(--text)' }}>
                  {tool.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tool.description}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge ${tool.category}`}>{tool.category}</span>
                {i === active && <ArrowRight size={13} color="var(--accent)" />}
              </div>
            </button>
          ))}
        </div>
        <div style={footerStyle}>
          <span>↑↓ navegar</span>
          <span>↵ selecionar</span>
          <span>ESC fechar</span>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 500,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  paddingTop: '15vh',
  backdropFilter: 'blur(4px)',
}

const modalStyle: React.CSSProperties = {
  width: '100%', maxWidth: 520,
  background: 'var(--surface)',
  border: '1px solid var(--border-2)',
  borderRadius: 4,
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  animation: 'fadeIn 150ms ease both',
}

const searchBoxStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '12px 14px',
}

const inputStyle: React.CSSProperties = {
  flex: 1, background: 'none', border: 'none', outline: 'none',
  color: 'var(--text)', fontSize: 14,
}

const kbdStyle: React.CSSProperties = {
  fontSize: 10, padding: '2px 5px',
  border: '1px solid var(--border-2)',
  borderRadius: 2, color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
}

const listStyle: React.CSSProperties = {
  maxHeight: 300, overflowY: 'auto',
}

const emptyStyle: React.CSSProperties = {
  padding: '20px 14px', textAlign: 'center',
  color: 'var(--text-muted)', fontSize: 13,
}

function itemStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%', padding: '10px 14px',
    background: active ? 'var(--accent-dim)' : 'transparent',
    borderBottom: '1px solid var(--border)',
    transition: 'background var(--tr)',
    cursor: 'pointer',
  }
}

const footerStyle: React.CSSProperties = {
  display: 'flex', gap: 16, padding: '8px 14px',
  borderTop: '1px solid var(--border)',
  fontSize: 11, color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
}
