import { useState, useMemo } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { CodeEditor } from '../../components/CodeEditor'
import { useToast } from '../../components/Toast'
import { useWorker } from '../../hooks/useWorker'

interface DiffLine {
  text: string
  status: 'added' | 'removed' | 'equal'
}

interface WorkerRequest {
  type: 'diff'
  left: string
  right: string
}

interface WorkerResponse {
  ok: boolean
  lines?: DiffLine[]
  stats?: { added: number; removed: number; equal: number }
  error?: string
}

type DisplayLine = DiffLine | { collapsed: number }

const CONTEXT = 3

const ADDED = {
  bg: 'rgba(74, 250, 123, 0.07)',
  border: 'rgba(74, 250, 123, 0.5)',
  text: 'rgba(74, 250, 123, 0.9)',
  badgeBg: 'rgba(74, 250, 123, 0.08)',
  badgeBorder: 'rgba(74, 250, 123, 0.2)',
} as const

const REMOVED = {
  bg: 'rgba(255, 69, 69, 0.07)',
  border: 'rgba(255, 69, 69, 0.5)',
  text: 'rgba(255, 69, 69, 0.85)',
  badgeBg: 'rgba(255, 69, 69, 0.08)',
  badgeBorder: 'rgba(255, 69, 69, 0.2)',
} as const

const ROW_STYLES: Record<DiffLine['status'], React.CSSProperties> = {
  added:   { display: 'flex', background: ADDED.bg,   borderLeft: `2px solid ${ADDED.border}` },
  removed: { display: 'flex', background: REMOVED.bg, borderLeft: `2px solid ${REMOVED.border}` },
  equal:   { display: 'flex', background: 'transparent', borderLeft: '2px solid transparent' },
}

const GUTTER_BASE: React.CSSProperties = {
  flexShrink: 0, width: 28, padding: '0 8px', userSelect: 'none', textAlign: 'center',
}

const GUTTER_STYLES: Record<DiffLine['status'], React.CSSProperties> = {
  added:   { ...GUTTER_BASE, color: 'var(--accent)', fontWeight: 600 },
  removed: { ...GUTTER_BASE, color: 'var(--error)',  fontWeight: 600 },
  equal:   { ...GUTTER_BASE, color: 'var(--text-dim)', fontWeight: 400 },
}

const TEXT_BASE: React.CSSProperties = { flex: 1, padding: '0 12px 0 0', whiteSpace: 'pre' }

const TEXT_STYLES: Record<DiffLine['status'], React.CSSProperties> = {
  added:   { ...TEXT_BASE, color: ADDED.text },
  removed: { ...TEXT_BASE, color: REMOVED.text },
  equal:   { ...TEXT_BASE, color: 'var(--text-muted)' },
}

const GUTTER_CHAR: Record<DiffLine['status'], string> = {
  added: '+', removed: '−', equal: ' ',
}

function applyContext(lines: DiffLine[]): DisplayLine[] {
  const result: DisplayLine[] = []
  let i = 0
  while (i < lines.length) {
    if (lines[i].status === 'equal') {
      let j = i
      while (j < lines.length && lines[j].status === 'equal') j++
      const run = j - i
      if (run > CONTEXT * 2) {
        for (let k = 0; k < CONTEXT; k++) result.push(lines[i + k])
        result.push({ collapsed: run - CONTEXT * 2 })
        for (let k = run - CONTEXT; k < run; k++) result.push(lines[i + k])
      } else {
        for (let k = i; k < j; k++) result.push(lines[k])
      }
      i = j
    } else {
      result.push(lines[i])
      i++
    }
  }
  return result
}

export default function JsonDiff() {
  const { toast } = useToast()
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [lines, setLines] = useState<DiffLine[] | null>(null)
  const [stats, setStats] = useState<{ added: number; removed: number; equal: number } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [onlyChanges, setOnlyChanges] = useState(false)

  const { post } = useWorker<WorkerRequest, WorkerResponse>(
    () => new Worker(new URL('../../workers/jsonDiff.worker.ts', import.meta.url), { type: 'module' }),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) {
          toast(res.error ?? 'JSON inválido', 'error')
          return
        }
        setLines(res.lines ?? [])
        setStats(res.stats ?? null)
      },
      onError: () => {
        setProcessing(false)
        toast('Erro inesperado no worker', 'error')
      },
    }
  )

  const clearResult = () => { setLines(null); setStats(null) }

  const compare = () => {
    if (!left.trim()) { toast('Cole o JSON A', 'error'); return }
    if (!right.trim()) { toast('Cole o JSON B', 'error'); return }
    clearResult()
    setProcessing(true)
    post({ type: 'diff', left, right })
  }

  const swap = () => { setLeft(right); setRight(left); clearResult() }

  const isIdentical = stats && stats.added === 0 && stats.removed === 0

  const displayLines = useMemo<DisplayLine[]>(
    () => lines ? (onlyChanges ? applyContext(lines) : lines) : [],
    [lines, onlyChanges]
  )

  return (
    <ToolLayout
      name="JSON Diff"
      description="Compare dois objetos JSON e visualize as diferenças linha a linha"
      badge="formatter"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <CodeEditor
          value={left}
          onChange={setLeft}
          label="JSON A"
          placeholder={'{\n  "nome": "João",\n  "idade": 30\n}'}
          minHeight={220}
        />
        <CodeEditor
          value={right}
          onChange={setRight}
          label="JSON B"
          placeholder={'{\n  "nome": "Maria",\n  "idade": 25\n}'}
          minHeight={220}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={compare} disabled={processing}>
          {processing ? 'Comparando…' : 'Comparar'}
        </button>
        <button className="btn" onClick={swap} title="Trocar A ↔ B" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeftRight size={13} />
          Trocar
        </button>

        {lines && !isIdentical && (
          <label className="checkbox-label" style={{ marginLeft: 4 }}>
            <input type="checkbox" checked={onlyChanges} onChange={e => setOnlyChanges(e.target.checked)} />
            Só mudanças
          </label>
        )}

        {stats && (
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'center' }}>
            {isIdentical ? (
              <span style={identicalBadgeStyle}>JSONs idênticos</span>
            ) : (
              <>
                {stats.added > 0 && <span style={statBadgeStyle('added')}>+{stats.added}</span>}
                {stats.removed > 0 && <span style={statBadgeStyle('removed')}>−{stats.removed}</span>}
              </>
            )}
          </div>
        )}
      </div>

      {lines && !isIdentical && (
        <div style={diffContainerStyle}>
          {displayLines.map((item, i) => {
            if ('collapsed' in item) {
              return (
                <div key={i} style={collapsedStyle}>
                  ··· {item.collapsed} linha{item.collapsed !== 1 ? 's' : ''} sem alteração ···
                </div>
              )
            }
            return (
              <div key={i} style={ROW_STYLES[item.status]}>
                <span style={GUTTER_STYLES[item.status]}>{GUTTER_CHAR[item.status]}</span>
                <span style={TEXT_STYLES[item.status]}>{item.text}</span>
              </div>
            )
          })}
        </div>
      )}
    </ToolLayout>
  )
}

const diffContainerStyle: React.CSSProperties = {
  border: '1px solid var(--border-2)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  overflow: 'auto',
  maxHeight: 540,
  fontFamily: 'var(--font-mono)',
  fontSize: 12.5,
  lineHeight: 1.7,
}

const collapsedStyle: React.CSSProperties = {
  padding: '4px 12px 4px 28px',
  color: 'var(--text-dim)',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  background: 'var(--surface-2)',
  borderLeft: '2px solid var(--border-2)',
  userSelect: 'none',
}

function statBadgeStyle(type: 'added' | 'removed'): React.CSSProperties {
  const c = type === 'added' ? ADDED : REMOVED
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    fontWeight: 600,
    color: type === 'added' ? 'var(--accent)' : 'var(--error)',
    background: c.badgeBg,
    border: `1px solid ${c.badgeBorder}`,
    borderRadius: 'var(--radius)',
    padding: '2px 8px',
  }
}

const identicalBadgeStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--accent)',
  background: 'var(--accent-dim)',
  border: '1px solid var(--accent-border)',
  borderRadius: 'var(--radius)',
  padding: '2px 10px',
}
