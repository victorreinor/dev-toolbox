import { Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, Link } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { SearchModal } from './components/SearchModal'
import { ToastProvider } from './components/Toast'
import { getToolById, registry } from './registry'

function Home() {
  return (
    <div style={homeStyle}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 }}>
        $ devutils --list
      </div>
      <h1 style={homeTitleStyle}>DevUtils</h1>
      <p style={homeSubStyle}>Ferramentas de dev, sem servidor, sem frescura.</p>
      <div style={homeGridStyle}>
        {registry.map(tool => (
          <Link
            key={tool.id}
            to={`/tools/${tool.id}`}
            className="home-card"
          >
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
        ))}
      </div>
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

  return (
    <div style={layoutStyle}>
      <Sidebar onSearch={() => setSearchOpen(true)} />
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

