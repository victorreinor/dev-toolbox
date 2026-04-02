import { Suspense, useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, Link } from 'react-router-dom'
import { Star, GripVertical } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { SearchModal } from './components/SearchModal'
import { ToastProvider } from './components/Toast'
import { getToolById, registry } from './registry'
import { useFavorites } from './hooks/useFavorites'
import { useCardOrder } from './hooks/useCardOrder'
import type { ToolMeta } from './types'

function ToolCard({ tool, isFavorite, onToggleFavorite }: { tool: ToolMeta; isFavorite: boolean; onToggleFavorite: (id: string) => void }) {
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <Link to={`/tools/${tool.id}`} draggable={false} className="home-card" style={{ paddingRight: 40, height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {tool.name}
          </span>
          <span className={`badge ${tool.category}`}>{tool.category}</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {tool.description}
        </p>
      </Link>
      <button
        onClick={e => { e.preventDefault(); onToggleFavorite(tool.id) }}
        title={isFavorite ? 'Remover dos atalhos' : 'Fixar nos atalhos'}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          borderRadius: 'var(--radius)',
          color: isFavorite ? 'var(--warning)' : 'var(--text-dim)',
          transition: 'color var(--tr)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={e => { if (!isFavorite) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
        onMouseLeave={e => { if (!isFavorite) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)' }}
      >
        <Star size={14} fill={isFavorite ? 'var(--warning)' : 'none'} />
      </button>
    </div>
  )
}

function DraggableGrid({
  tools,
  favorites,
  onToggleFavorite,
  onReorder,
}: {
  tools: ToolMeta[]
  favorites: Set<string>
  onToggleFavorite: (id: string) => void
  onReorder: (from: number, to: number) => void
}) {
  const drag = useRef<{ id: string | null; overId: string | null }>({ id: null, overId: null })
  const els = useRef<Map<string, HTMLDivElement>>(new Map())

  const cls = (id: string | null, name: string, on: boolean) =>
    id && els.current.get(id)?.classList.toggle(name, on)

  const cleanup = () => {
    cls(drag.current.id, 'is-dragging', false)
    cls(drag.current.overId, 'is-over', false)
    drag.current = { id: null, overId: null }
  }

  return (
    <div style={homeGridStyle}>
      {tools.map(tool => (
        <div
          key={tool.id}
          ref={el => { if (el) els.current.set(tool.id, el); else els.current.delete(tool.id) }}
          draggable
          className="drag-wrapper"
          style={{ position: 'relative' }}
          onDragStart={e => {
            e.dataTransfer.effectAllowed = 'move'
            drag.current.id = tool.id
            // Delay until after browser captures the drag ghost image
            requestAnimationFrame(() => cls(tool.id, 'is-dragging', true))
          }}
          onDragEnter={e => {
            e.preventDefault()
            const { id, overId } = drag.current
            if (!id || tool.id === id || tool.id === overId) return
            cls(overId, 'is-over', false)
            drag.current.overId = tool.id
            cls(tool.id, 'is-over', true)
          }}
          onDragOver={e => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }}
          onDragLeave={e => {
            if (drag.current.overId !== tool.id) return
            if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return
            cls(tool.id, 'is-over', false)
            drag.current.overId = null
          }}
          onDrop={e => {
            e.preventDefault()
            const fromId = drag.current.id
            if (fromId && fromId !== tool.id) {
              const from = tools.findIndex(t => t.id === fromId)
              const to = tools.findIndex(t => t.id === tool.id)
              if (from !== -1 && to !== -1) onReorder(from, to)
            }
            cleanup()
          }}
          onDragEnd={cleanup}
        >
          <span className="drag-handle">
            <GripVertical size={12} />
          </span>
          <ToolCard tool={tool} isFavorite={favorites.has(tool.id)} onToggleFavorite={onToggleFavorite} />
        </div>
      ))}
    </div>
  )
}

function Home() {
  const { favorites, toggle } = useFavorites()

  const pinnedIds = useMemo(
    () => registry.filter(t => favorites.has(t.id)).map(t => t.id),
    [favorites]
  )

  const { allOrder, pinnedOrder, reorderAll, reorderPinned } = useCardOrder(pinnedIds)

  const pinnedTools = useMemo(
    () => pinnedOrder.map(id => registry.find(t => t.id === id)!).filter(Boolean),
    [pinnedOrder]
  )

  const allTools = useMemo(
    () => allOrder.map(id => registry.find(t => t.id === id)!).filter(Boolean),
    [allOrder]
  )

  return (
    <div style={homeStyle}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 }}>
        $ devutils --list
      </div>
      <h1 style={homeTitleStyle}>DevUtils</h1>
      <p style={homeSubStyle}>Ferramentas de dev, sem servidor, sem frescura.</p>

      {pinnedTools.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Star size={13} fill="var(--warning)" color="var(--warning)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Atalhos
            </span>
          </div>
          <DraggableGrid
            tools={pinnedTools}
            favorites={favorites}
            onToggleFavorite={toggle}
            onReorder={reorderPinned}
          />
          <div style={{ marginTop: 32, marginBottom: 16, borderTop: '1px solid var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Todas as ferramentas
            </span>
          </div>
        </section>
      )}

      <DraggableGrid
        tools={allTools}
        favorites={favorites}
        onToggleFavorite={toggle}
        onReorder={reorderAll}
      />
    </div>
  )
}

function ToolPage() {
  const { id } = useParams<{ id: string }>()
  const tool = id ? getToolById(id) : undefined

  if (!tool) {
    return (
      <div style={{ padding: 40, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        404 — ferramenta não encontrada
      </div>
    )
  }

  const Component = tool.component

  return (
    <Suspense fallback={
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)' }}>
        <span className="spinner" />
        <span className="mono" style={{ fontSize: 12 }}>carregando…</span>
      </div>
    }>
      <Component />
    </Suspense>
  )
}

function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <div style={layoutStyle}>
      <Sidebar onSearch={() => setSearchOpen(true)} theme={theme} onToggleTheme={toggleTheme} />
      <main style={mainStyle}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools/:id" element={<ToolPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Layout />
      </ToastProvider>
    </BrowserRouter>
  )
}

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
}

const mainStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  height: '100vh',
}

const homeStyle: React.CSSProperties = {
  padding: '48px 40px',
  maxWidth: 880,
  animation: 'fadeIn 250ms ease both',
}

const homeTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 48,
  fontWeight: 700,
  color: 'var(--text)',
  letterSpacing: '-0.04em',
  marginBottom: 12,
  lineHeight: 1,
}

const homeSubStyle: React.CSSProperties = {
  fontSize: 16,
  color: 'var(--text-muted)',
  marginBottom: 40,
  fontStyle: 'italic',
}

const homeGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 12,
}
