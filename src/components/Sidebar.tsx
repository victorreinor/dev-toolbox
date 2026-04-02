import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Terminal, Bug, Lightbulb, Sun, Moon } from 'lucide-react'
import { registry } from '../registry'
import type { ToolCategory } from '../types'

const GITHUB_REPO = 'https://github.com/victorreinor/dev-toolbox'
const BUG_REPORT_URL = `${GITHUB_REPO}/issues/new?template=bug_report.yml`
const FEATURE_REQUEST_URL = `${GITHUB_REPO}/issues/new?template=feature_request.yml`

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  converter: 'Conversores',
  generator: 'Geradores',
  formatter: 'Formatadores',
  validator: 'Validadores',
}

const CATEGORY_ORDER: ToolCategory[] = ['converter', 'generator', 'formatter', 'validator']

interface SidebarProps {
  onSearch: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function Sidebar({ onSearch, theme, onToggleTheme }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Group tools by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof registry>>((acc, cat) => {
    const tools = registry.filter(t => t.category === cat)
    if (tools.length > 0) acc[cat] = tools
    return acc
  }, {})

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSearch])

  return (
    <aside style={sidebarStyle(collapsed)}>
      {/* Logo */}
      <div style={logoAreaStyle}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={16} color="var(--accent)" />
            <span style={logoStyle}>DevUtils</span>
          </div>
        )}
        {collapsed && <Terminal size={16} color="var(--accent)" />}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={collapseBtn}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="divider" />

      {/* Search */}
      {!collapsed && (
        <button style={searchBtnStyle} onClick={onSearch}>
          <Search size={13} color="var(--text-muted)" />
          <span style={{ flex: 1, textAlign: 'left', color: 'var(--text-muted)', fontSize: 12 }}>
            Buscar…
          </span>
          <kbd style={kbdStyle}>⌘K</kbd>
        </button>
      )}
      {collapsed && (
        <button style={iconBtnStyle} onClick={onSearch} title="Buscar (⌘K)">
          <Search size={15} color="var(--text-muted)" />
        </button>
      )}

      {/* Tool groups */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '8px 0' : '8px 0' }}>
        {Object.entries(grouped).map(([cat, tools]) => (
          <div key={cat} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={groupLabelStyle}>
                {CATEGORY_LABELS[cat as ToolCategory]}
              </div>
            )}
            {tools.map(tool => (
              <NavLink
                key={tool.id}
                to={`/tools/${tool.id}`}
                style={({ isActive }) => navLinkStyle(isActive, collapsed)}
                title={collapsed ? tool.name : undefined}
              >
                {!collapsed ? (
                  <span style={{ fontSize: 13 }}>{tool.name}</span>
                ) : (
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textAlign: 'center', lineHeight: 1.2 }}>
                    {tool.name.replace('→', '→\n').split('\n')[0].slice(0, 4)}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={footerStyle}>
        {!collapsed ? (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              <a
                href={BUG_REPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={footerLinkStyle}
                title="Reportar um bug"
              >
                <Bug size={12} />
                <span>Reportar bug</span>
              </a>
              <a
                href={FEATURE_REQUEST_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={footerLinkStyle}
                title="Sugerir uma ideia"
              >
                <Lightbulb size={12} />
                <span>Nova ideia</span>
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                {registry.length} ferramentas
              </span>
              <button
                onClick={onToggleTheme}
                style={themeToggleStyle}
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              >
                {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <a
              href={BUG_REPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={iconFooterLinkStyle}
              title="Reportar bug"
            >
              <Bug size={13} />
            </a>
            <a
              href={FEATURE_REQUEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={iconFooterLinkStyle}
              title="Nova ideia"
            >
              <Lightbulb size={13} />
            </a>
            <button
              onClick={onToggleTheme}
              style={{ ...iconFooterLinkStyle, background: 'none', border: 'none', cursor: 'pointer' }}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function sidebarStyle(collapsed: boolean): React.CSSProperties {
  return {
    width: collapsed ? 52 : 'var(--sidebar-w)',
    minWidth: collapsed ? 52 : 'var(--sidebar-w)',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    transition: 'width 200ms ease, min-width 200ms ease',
    overflow: 'hidden',
    flexShrink: 0,
    zIndex: 10,
  }
}

const logoAreaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 12px',
  gap: 8,
}

const logoStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--text)',
  letterSpacing: '-0.02em',
  whiteSpace: 'nowrap',
}

const collapseBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  border: '1px solid var(--border-2)',
  borderRadius: 2,
  color: 'var(--text-muted)',
  background: 'transparent',
  flexShrink: 0,
  transition: 'all var(--tr)',
}

const searchBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '8px 10px',
  padding: '6px 8px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 2,
  cursor: 'pointer',
  transition: 'border-color var(--tr)',
}

const iconBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '8px auto',
  padding: 8,
  background: 'transparent',
  border: 'none',
  borderRadius: 2,
  cursor: 'pointer',
}

const groupLabelStyle: React.CSSProperties = {
  padding: '10px 12px 4px',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-dim)',
}

function navLinkStyle(isActive: boolean, collapsed: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: collapsed ? '8px 0' : '6px 12px',
    margin: collapsed ? '1px 6px' : '1px 6px',
    borderRadius: 2,
    background: isActive ? 'var(--accent-dim)' : 'transparent',
    borderLeft: isActive && !collapsed ? '2px solid var(--accent)' : '2px solid transparent',
    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
    transition: 'all var(--tr)',
    fontFamily: 'var(--font-mono)',
    textDecoration: 'none',
  }
}

const kbdStyle: React.CSSProperties = {
  fontSize: 10, padding: '1px 4px',
  border: '1px solid var(--border-2)',
  borderRadius: 2,
  color: 'var(--text-dim)',
  fontFamily: 'var(--font-mono)',
}

const footerStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderTop: '1px solid var(--border)',
}

const footerLinkStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  padding: '4px 6px',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-dim)',
  border: '1px solid var(--border)',
  borderRadius: 2,
  textDecoration: 'none',
  transition: 'color var(--tr), border-color var(--tr)',
  whiteSpace: 'nowrap',
}

const iconFooterLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '5px',
  color: 'var(--text-dim)',
  borderRadius: 2,
  transition: 'color var(--tr)',
}

const themeToggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3px 5px',
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 2,
  color: 'var(--text-dim)',
  cursor: 'pointer',
  transition: 'color var(--tr), border-color var(--tr)',
}
