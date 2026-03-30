import { useState } from 'react'
import { Copy, Check, RotateCcw } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

type Tab = 'diff' | 'calc' | 'timestamp' | 'formats'

const TAB_LABELS: Record<Tab, string> = {
  diff: 'Diferença',
  calc: 'Calculadora',
  timestamp: 'Timestamp',
  formats: 'Formatos',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDiff(ms: number): {
  total: { days: number; hours: number; minutes: number; seconds: number }
  parts: { years: number; months: number; days: number; hours: number; minutes: number; seconds: number }
} {
  const abs = Math.abs(ms)
  const totalSecs = Math.floor(abs / 1000)
  const totalMins = Math.floor(totalSecs / 60)
  const totalHours = Math.floor(totalMins / 60)
  const totalDays = Math.floor(totalHours / 24)

  // approximate breakdown
  const years = Math.floor(totalDays / 365)
  const months = Math.floor((totalDays % 365) / 30)
  const days = Math.floor((totalDays % 365) % 30)
  const hours = totalHours % 24
  const minutes = totalMins % 60
  const seconds = totalSecs % 60

  return {
    total: { days: totalDays, hours: totalHours, minutes: totalMins, seconds: totalSecs },
    parts: { years, months, days, hours, minutes, seconds },
  }
}

function addToDate(date: Date, value: number, unit: string): Date {
  const d = new Date(date)
  switch (unit) {
    case 'seconds': d.setSeconds(d.getSeconds() + value); break
    case 'minutes': d.setMinutes(d.getMinutes() + value); break
    case 'hours':   d.setHours(d.getHours() + value); break
    case 'days':    d.setDate(d.getDate() + value); break
    case 'weeks':   d.setDate(d.getDate() + value * 7); break
    case 'months':  d.setMonth(d.getMonth() + value); break
    case 'years':   d.setFullYear(d.getFullYear() + value); break
  }
  return d
}

function formatDate(d: Date): Record<string, string> {
  const locale = 'pt-BR'
  return {
    'ISO 8601': d.toISOString(),
    'ISO Date': d.toISOString().split('T')[0],
    'RFC 2822': d.toUTCString(),
    'Unix (s)': String(Math.floor(d.getTime() / 1000)),
    'Unix (ms)': String(d.getTime()),
    'PT-BR': d.toLocaleString(locale),
    'PT-BR (data)': d.toLocaleDateString(locale),
    'PT-BR (hora)': d.toLocaleTimeString(locale),
    'EN-US': d.toLocaleString('en-US'),
    'Relativo': getRelativeTime(d),
    'Dia da semana': d.toLocaleDateString(locale, { weekday: 'long' }),
    'Mês': d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    'Trimestre': `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`,
    'Semana do ano': `Semana ${getWeekNumber(d)} de ${d.getFullYear()}`,
  }
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getRelativeTime(d: Date): string {
  const diffMs = d.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  if (abs < 60_000)      return rtf.format(Math.round(diffMs / 1000), 'second')
  if (abs < 3_600_000)   return rtf.format(Math.round(diffMs / 60_000), 'minute')
  if (abs < 86_400_000)  return rtf.format(Math.round(diffMs / 3_600_000), 'hour')
  if (abs < 2_592_000_000) return rtf.format(Math.round(diffMs / 86_400_000), 'day')
  if (abs < 31_536_000_000) return rtf.format(Math.round(diffMs / 2_592_000_000), 'month')
  return rtf.format(Math.round(diffMs / 31_536_000_000), 'year')
}

// ─── Sub-tabs ──────────────────────────────────────────────────────────────────

function DiffTab() {
  const now = new Date()
  const [dateA, setDateA] = useState(toLocalDatetimeString(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [dateB, setDateB] = useState(toLocalDatetimeString(now))

  const a = new Date(dateA)
  const b = new Date(dateB)
  const valid = !isNaN(a.getTime()) && !isNaN(b.getTime())
  const diff = valid ? formatDiff(b.getTime() - a.getTime()) : null
  const isNegative = valid && b.getTime() < a.getTime()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label className="label">Data inicial</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="datetime-local" className="input" value={dateA} onChange={e => setDateA(e.target.value)} style={{ flex: 1 }} />
            <button className="btn ghost" style={{ padding: '6px 8px', flexShrink: 0 }} onClick={() => setDateA(toLocalDatetimeString(new Date()))} title="Agora">⏱</button>
          </div>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label className="label">Data final</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="datetime-local" className="input" value={dateB} onChange={e => setDateB(e.target.value)} style={{ flex: 1 }} />
            <button className="btn ghost" style={{ padding: '6px 8px', flexShrink: 0 }} onClick={() => setDateB(toLocalDatetimeString(new Date()))} title="Agora">⏱</button>
          </div>
        </div>
      </div>

      {diff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isNegative && (
            <p style={{ fontSize: 12, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>⚠ A data final é anterior à inicial</p>
          )}

          {/* Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
            {Object.entries(diff.parts).map(([unit, val]) => (
              <div key={unit} style={{ padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.03em' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{unit}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <span className="label" style={{ marginBottom: 8, display: 'block' }}>Totais absolutos</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
              {Object.entries(diff.total).map(([unit, val]) => (
                <span key={unit} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{val.toLocaleString('pt-BR')}</span>{' '}
                  <span style={{ color: 'var(--text-muted)' }}>{unit}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CalcTab() {
  const [baseDate, setBaseDate] = useState(toLocalDatetimeString(new Date()))
  const [operation, setOperation] = useState<'+' | '-'>('+')
  const [value, setValue] = useState(7)
  const [unit, setUnit] = useState('days')

  const base = new Date(baseDate)
  const valid = !isNaN(base.getTime())
  const result = valid ? addToDate(base, operation === '+' ? value : -value, unit) : null
  const { copy, copied } = useCopyToClipboard()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 2, minWidth: 200 }}>
          <label className="label">Data base</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="datetime-local" className="input" value={baseDate} onChange={e => setBaseDate(e.target.value)} style={{ flex: 1 }} />
            <button className="btn ghost" style={{ padding: '6px 8px', flexShrink: 0 }} onClick={() => setBaseDate(toLocalDatetimeString(new Date()))} title="Agora">⏱</button>
          </div>
        </div>
        <div className="field">
          <label className="label">Operação</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['+', '-'] as const).map(op => (
              <button key={op} className={`btn${operation === op ? ' primary' : ' ghost'}`} style={{ width: 36 }} onClick={() => setOperation(op)}>
                {op}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="label">Valor</label>
          <input className="input" type="number" min={0} value={value} onChange={e => setValue(Number(e.target.value))} style={{ width: 90 }} />
        </div>
        <div className="field">
          <label className="label">Unidade</label>
          <select className="select" value={unit} onChange={e => setUnit(e.target.value)}>
            {['seconds','minutes','hours','days','weeks','months','years'].map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {result && (
        <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <span className="label" style={{ marginBottom: 6, display: 'block' }}>Resultado</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                {result.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' })}
              </span>
              <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ISO: {result.toISOString()}
              </p>
            </div>
            <button className="btn ghost" onClick={() => copy(result.toISOString())}>
              {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TimestampTab() {
  const [tsInput, setTsInput] = useState(String(Math.floor(Date.now() / 1000)))
  const [tsUnit, setTsUnit] = useState<'s' | 'ms'>('s')
  const [dateInput, setDateInput] = useState(toLocalDatetimeString(new Date()))
  const { copy, copied } = useCopyToClipboard()

  const tsMs = tsUnit === 'ms' ? Number(tsInput) : Number(tsInput) * 1000
  const fromTs = !isNaN(tsMs) && tsInput !== '' ? new Date(tsMs) : null
  const fromDate = new Date(dateInput)
  const dateValid = !isNaN(fromDate.getTime())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Timestamp → Date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="label">Timestamp → Data</span>
          <button className="btn ghost" style={{ fontSize: 11 }} onClick={() => setTsInput(String(Math.floor(Date.now() / 1000)))}>
            <RotateCcw size={11} /> Agora
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            value={tsInput}
            onChange={e => setTsInput(e.target.value)}
            placeholder="1700000000"
            style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {(['s', 'ms'] as const).map(u => (
              <button key={u} className={`btn${tsUnit === u ? ' primary' : ' ghost'}`} style={{ minWidth: 44 }} onClick={() => setTsUnit(u)}>
                {u}
              </button>
            ))}
          </div>
        </div>
        {fromTs && !isNaN(fromTs.getTime()) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--accent)', fontWeight: 600 }}>
              {fromTs.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' })}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
              ISO: {fromTs.toISOString()}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
              {getRelativeTime(fromTs)}
            </span>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Date → Timestamp */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="label">Data → Timestamp</span>
          <button className="btn ghost" style={{ fontSize: 11 }} onClick={() => setDateInput(toLocalDatetimeString(new Date()))}>
            <RotateCcw size={11} /> Agora
          </button>
        </div>
        <input
          type="datetime-local"
          className="input"
          value={dateInput}
          onChange={e => setDateInput(e.target.value)}
        />
        {dateValid && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Unix (s)', value: String(Math.floor(fromDate.getTime() / 1000)) },
              { label: 'Unix (ms)', value: String(fromDate.getTime()) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flex: 1, minWidth: 180 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 64, flexShrink: 0 }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)', fontWeight: 600, flex: 1 }}>{value}</span>
                <button className="btn ghost" style={{ padding: '2px 6px' }} onClick={() => copy(value)}>
                  {copied ? <Check size={11} color="var(--accent)" /> : <Copy size={11} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FormatsTab() {
  const [dateInput, setDateInput] = useState(toLocalDatetimeString(new Date()))
  const [lastCopied, setLastCopied] = useState<string | null>(null)

  const d = new Date(dateInput)
  const valid = !isNaN(d.getTime())
  const formats = valid ? formatDate(d) : null

  const copyLabel = (label: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setLastCopied(label)
      setTimeout(() => setLastCopied(null), 1500)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="label">Data para formatar</label>
          <input
            type="datetime-local"
            className="input"
            value={dateInput}
            onChange={e => setDateInput(e.target.value)}
          />
        </div>
        <button className="btn ghost" onClick={() => setDateInput(toLocalDatetimeString(new Date()))} title="Agora">
          <RotateCcw size={14} /> Agora
        </button>
      </div>

      {formats && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {Object.entries(formats).map(([label, value], i, arr) => (
            <div
              key={label}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <span style={{ width: 140, flexShrink: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
              <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text)', wordBreak: 'break-all' }}>{value}</span>
              <button className="btn ghost" style={{ padding: '2px 6px', flexShrink: 0 }} onClick={() => copyLabel(label, value)}>
                {lastCopied === label ? <Check size={11} color="var(--accent)" /> : <Copy size={11} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function DateUtils() {
  const [tab, setTab] = useState<Tab>('diff')

  return (
    <ToolLayout
      name="Utilitários de Data"
      description="Diferença, calculadora, timestamp e conversão de formatos"
      badge="formatter"
    >
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3, width: 'fit-content' }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button
            key={t}
            className={`btn${tab === t ? ' primary' : ' ghost'}`}
            style={{ padding: '4px 14px', fontSize: 12 }}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'diff'      && <DiffTab />}
      {tab === 'calc'      && <CalcTab />}
      {tab === 'timestamp' && <TimestampTab />}
      {tab === 'formats'   && <FormatsTab />}
    </ToolLayout>
  )
}
