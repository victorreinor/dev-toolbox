import { useRef, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'parser' | 'builder' | 'reference'
type BuildMode = 'every-minutes' | 'every-hours' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom'

interface CronField {
  raw: string
  label: string
  description: string
}

interface ParsedCron {
  expression: string
  isAws: boolean
  fields: CronField[]
  humanReadable: string
  isValid: boolean
  error?: string
}

// ─── Parser logic ─────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, string> = {
  '1': 'janeiro', '2': 'fevereiro', '3': 'março', '4': 'abril',
  '5': 'maio', '6': 'junho', '7': 'julho', '8': 'agosto',
  '9': 'setembro', '10': 'outubro', '11': 'novembro', '12': 'dezembro',
  'JAN': 'janeiro', 'FEB': 'fevereiro', 'MAR': 'março', 'APR': 'abril',
  'MAY': 'maio', 'JUN': 'junho', 'JUL': 'julho', 'AUG': 'agosto',
  'SEP': 'setembro', 'OCT': 'outubro', 'NOV': 'novembro', 'DEC': 'dezembro',
}

const DOW_NAMES: Record<string, string> = {
  '0': 'domingo', '1': 'segunda', '2': 'terça', '3': 'quarta',
  '4': 'quinta', '5': 'sexta', '6': 'sábado', '7': 'domingo',
  'SUN': 'domingo', 'MON': 'segunda', 'TUE': 'terça', 'WED': 'quarta',
  'THU': 'quinta', 'FRI': 'sexta', 'SAT': 'sábado',
}

function isWild(v: string) { return v === '*' || v === '?' }
function lookup(v: string, map: Record<string, string>): string { return map[v.toUpperCase()] ?? v }

function ordinal(n: string): string {
  const num = parseInt(n)
  if (num === 1) return '1º'
  if (num === 2) return '2º'
  if (num === 3) return '3º'
  return `${n}º`
}

function describeMinute(v: string): string {
  if (isWild(v)) return 'todo minuto'
  if (v === '0') return 'no minuto 0 (início da hora)'
  if (v.startsWith('*/')) {
    const n = v.slice(2)
    return n === '1' ? 'todo minuto' : `a cada ${n} minutos`
  }
  if (v.includes('/')) {
    const [start, step] = v.split('/')
    return `a partir do minuto ${start}, a cada ${step} minutos`
  }
  if (v.includes(',')) return 'nos minutos ' + v.split(',').join(', ')
  if (v.includes('-')) {
    const [a, b] = v.split('-')
    return `do minuto ${a} ao ${b}`
  }
  return `no minuto ${v}`
}

function describeHour(v: string): string {
  if (isWild(v)) return 'toda hora'
  if (v.startsWith('*/')) {
    const n = v.slice(2)
    return n === '1' ? 'toda hora' : `a cada ${n} horas`
  }
  if (v.includes('/')) {
    const [start, step] = v.split('/')
    return `a partir das ${start.padStart(2, '0')}h, a cada ${step} horas`
  }
  if (v.includes(',')) {
    return 'às ' + v.split(',').map(h => h.padStart(2, '0') + 'h').join(', ')
  }
  if (v.includes('-')) {
    const [a, b] = v.split('-')
    return `das ${a.padStart(2, '0')}h às ${b.padStart(2, '0')}h`
  }
  return `às ${v.padStart(2, '0')}h`
}

function describeDom(v: string): string {
  if (isWild(v)) return 'todo dia do mês'
  if (v === 'L') return 'no último dia do mês'
  if (v.endsWith('W')) return `no dia útil mais próximo do dia ${v.slice(0, -1)}`
  if (v.endsWith('LW')) return 'no último dia útil do mês'
  if (v.startsWith('*/')) return `a cada ${v.slice(2)} dias`
  if (v.includes(',')) return 'nos dias ' + v.split(',').join(', ')
  if (v.includes('-')) {
    const [a, b] = v.split('-')
    return `do dia ${a} ao ${b}`
  }
  return `no dia ${v}`
}

function describeMonth(v: string): string {
  if (isWild(v)) return 'todo mês'
  if (v.startsWith('*/')) return `a cada ${v.slice(2)} meses`
  if (v.includes(',')) return 'em ' + v.split(',').map(m => lookup(m, MONTH_NAMES)).join(', ')
  if (v.includes('-')) {
    const [a, b] = v.split('-')
    return `de ${lookup(a, MONTH_NAMES)} a ${lookup(b, MONTH_NAMES)}`
  }
  return 'em ' + lookup(v, MONTH_NAMES)
}

function describeDow(v: string): string {
  if (isWild(v)) return 'todo dia da semana'
  if (v.includes('#')) {
    const [dow, nth] = v.split('#')
    return `na ${ordinal(nth)} ${lookup(dow, DOW_NAMES)}-feira do mês`
  }
  if (v.endsWith('L')) return `na última ${lookup(v.slice(0, -1), DOW_NAMES)} do mês`
  if (v.includes(',')) return 'nas ' + v.split(',').map(d => lookup(d, DOW_NAMES)).join(', ')
  if (v.includes('-')) {
    const [a, b] = v.split('-')
    const normA = a.toUpperCase() === 'MON' ? '1' : a
    const normB = b.toUpperCase() === 'FRI' ? '5' : b
    if (normA === '1' && normB === '5') return 'dias úteis (segunda a sexta)'
    return `de ${lookup(a, DOW_NAMES)} a ${lookup(b, DOW_NAMES)}`
  }
  return `toda ${lookup(v, DOW_NAMES)}`
}

function describeYear(v: string): string {
  if (isWild(v)) return 'todo ano'
  if (v.includes('-')) {
    const [a, b] = v.split('-')
    return `de ${a} a ${b}`
  }
  if (v.includes(',')) return 'nos anos ' + v.split(',').join(', ')
  if (v.startsWith('*/')) return `a cada ${v.slice(2)} anos`
  return `em ${v}`
}

function buildHumanReadable(parts: string[], isAws: boolean): string {
  const [min, hour, dom, month, dow, year] = parts

  // Every minute
  if (isWild(min) && isWild(hour) && isWild(dom) && isWild(month) && isWild(dow)) {
    return 'A cada minuto'
  }

  // Every N minutes (all other fields wild)
  if (min.startsWith('*/') && isWild(hour) && isWild(dom) && isWild(month) && isWild(dow)) {
    const n = parseInt(min.slice(2))
    return n === 1 ? 'A cada minuto' : `A cada ${n} minutos`
  }

  // Every N hours
  if ((min === '0' || isWild(min)) && hour.startsWith('*/') && isWild(dom) && isWild(month) && isWild(dow)) {
    const n = parseInt(hour.slice(2))
    const suffix = min === '0' ? '' : `, no minuto ${min}`
    return `A cada ${n} hora${n !== 1 ? 's' : ''}${suffix}`
  }

  // Build time part
  let timePart = ''
  const minSpecific = !isWild(min) && /^\d+$/.test(min)
  const hourSpecific = !isWild(hour) && /^\d+$/.test(hour)

  if (minSpecific && hourSpecific) {
    timePart = `às ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  } else if (isWild(min) && hourSpecific) {
    timePart = `todo minuto das ${hour.padStart(2, '0')}h`
  } else if (min === '0' && hourSpecific) {
    timePart = `às ${hour.padStart(2, '0')}:00`
  } else {
    const timePieces: string[] = []
    if (!isWild(hour)) timePieces.push(describeHour(hour))
    if (!isWild(min)) timePieces.push(describeMinute(min))
    timePart = timePieces.join(', ')
    if (!timePart) timePart = 'a cada minuto'
  }

  // Day part
  const domWild = isWild(dom)
  const dowWild = isWild(dow)
  const monthWild = isWild(month)
  const yearWild = !year || isWild(year)

  let dayPart = ''
  if (domWild && dowWild) {
    dayPart = ''
  } else if (!domWild && dowWild) {
    dayPart = describeDom(dom)
  } else if (domWild && !dowWild) {
    const normDow = dow.toUpperCase()
    if (normDow === '1-5' || normDow === 'MON-FRI') {
      dayPart = 'dias úteis (seg–sex)'
    } else {
      dayPart = describeDow(dow)
    }
  }

  const monthPart = monthWild ? '' : describeMonth(month)
  const yearPart = isAws && !yearWild ? describeYear(year) : ''

  const segments: string[] = []
  if (dayPart) segments.push(dayPart)
  if (monthPart) segments.push(monthPart)
  if (yearPart) segments.push(yearPart)

  if (segments.length === 0) {
    return `Todo dia ${timePart}`
  }

  const prefix = segments.join(', ')
  return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}, ${timePart}`
}

function parseCron(raw: string): ParsedCron {
  const trimmed = raw.trim()

  // Detect AWS rate expression
  const rateMatch = trimmed.match(/^rate\((\d+)\s+(\w+)\)$/i)
  if (rateMatch) {
    const [, n, unit] = rateMatch
    const unitMap: Record<string, string> = {
      minute: 'minuto', minutes: 'minutos',
      hour: 'hora', hours: 'horas',
      day: 'dia', days: 'dias',
    }
    const unitPt = unitMap[unit.toLowerCase()] ?? unit
    return {
      expression: trimmed,
      isAws: true,
      fields: [],
      humanReadable: `A cada ${n} ${unitPt}`,
      isValid: true,
    }
  }

  // Strip AWS cron() wrapper
  const awsMatch = trimmed.match(/^cron\((.+)\)$/i)
  const isAws = !!awsMatch
  const expr = awsMatch ? awsMatch[1].trim() : trimmed

  const parts = expr.split(/\s+/)

  if (isAws && parts.length !== 6) {
    return { expression: expr, isAws, fields: [], humanReadable: '', isValid: false, error: `Cron AWS deve ter 6 campos (encontrados: ${parts.length})` }
  }
  if (!isAws && parts.length !== 5 && parts.length !== 6) {
    return { expression: expr, isAws, fields: [], humanReadable: '', isValid: false, error: `Cron deve ter 5 ou 6 campos (encontrados: ${parts.length})` }
  }

  // Standard 6-field: might have seconds as first field
  // AWS 6-field: min hour dom month dow year
  // We treat all as: [min, hour, dom, month, dow, ?year]
  const [min, hour, dom, month, dow, extra] = parts

  const fields: CronField[] = [
    { raw: min, label: 'Minuto', description: describeMinute(min) },
    { raw: hour, label: 'Hora', description: describeHour(hour) },
    { raw: dom, label: 'Dia do Mês', description: describeDom(dom) },
    { raw: month, label: 'Mês', description: describeMonth(month) },
    { raw: dow, label: 'Dia da Semana', description: describeDow(dow) },
  ]

  if (extra) {
    fields.push({
      raw: extra,
      label: isAws ? 'Ano' : 'Segundo (extra)',
      description: isAws ? describeYear(extra) : `${extra}`,
    })
  }

  const humanReadable = buildHumanReadable([min, hour, dom, month, dow, extra ?? '*'], isAws)

  return { expression: expr, isAws, fields, humanReadable, isValid: true }
}

// ─── Parser Tab ───────────────────────────────────────────────────────────────

function ParserTab() {
  const [input, setInput] = useState('')
  const { copy, copied } = useCopyToClipboard()

  const parsed = input.trim() ? parseCron(input) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="field">
        <label className="label">Expressão Cron</label>
        <input
          className="input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='Ex: */10 * ? * * *   ou   cron(0 8 * * MON-FRI *)   ou   rate(5 minutes)'
          style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}
          spellCheck={false}
        />
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Suporta formato padrão (5 campos), AWS <code style={{ fontFamily: 'var(--font-mono)' }}>cron(...)</code> e <code style={{ fontFamily: 'var(--font-mono)' }}>rate(...)</code>
        </p>
      </div>

      {parsed && !parsed.isValid && (
        <div style={{ padding: '12px 16px', background: 'var(--error-dim)', border: '1px solid rgba(255,69,69,0.25)', borderRadius: 'var(--radius)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--error)' }}>{parsed.error}</p>
        </div>
      )}

      {parsed && parsed.isValid && (
        <>
          <div style={{ padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Em português
              </p>
              <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                {parsed.humanReadable}
              </p>
            </div>
            <button className="btn ghost" style={{ padding: '4px 8px', flexShrink: 0 }} onClick={() => copy(parsed.humanReadable)}>
              {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
            </button>
          </div>

          {parsed.fields.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p className="label">Breakdown dos campos</p>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {parsed.fields.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '10px 14px',
                      borderBottom: i < parsed.fields.length - 1 ? '1px solid var(--border)' : 'none',
                      background: i % 2 === 0 ? 'var(--surface)' : 'transparent',
                    }}
                  >
                    <span style={{ width: 110, flexShrink: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {f.label}
                    </span>
                    <span style={{ width: 80, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                      {f.raw}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>
                      {f.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Formato detectado:{' '}
            <span style={{ color: 'var(--text)' }}>
              {parsed.isAws && input.trim().toLowerCase().startsWith('rate') && 'AWS rate()'}
              {parsed.isAws && !input.trim().toLowerCase().startsWith('rate') && 'AWS cron() — 6 campos'}
              {!parsed.isAws && parsed.fields.length === 5 && 'Padrão — 5 campos (min hora dom mês dow)'}
              {!parsed.isAws && parsed.fields.length === 6 && 'Padrão — 6 campos'}
            </span>
          </p>
        </>
      )}
    </div>
  )
}

// ─── Builder Tab ──────────────────────────────────────────────────────────────

const DOW_OPTIONS = [
  { value: '0', label: 'Dom' },
  { value: '1', label: 'Seg' },
  { value: '2', label: 'Ter' },
  { value: '3', label: 'Qua' },
  { value: '4', label: 'Qui' },
  { value: '5', label: 'Sex' },
  { value: '6', label: 'Sáb' },
]

const BUILD_MODES: { value: BuildMode; label: string }[] = [
  { value: 'every-minutes', label: 'A cada N minutos' },
  { value: 'every-hours', label: 'A cada N horas' },
  { value: 'daily', label: 'Todo dia, horário fixo' },
  { value: 'weekdays', label: 'Dias úteis, horário fixo' },
  { value: 'weekly', label: 'Dias específicos' },
  { value: 'monthly', label: 'Todo mês, no dia X' },
  { value: 'custom', label: 'Customizado' },
]

function pad2(n: number) { return String(n).padStart(2, '0') }

function BuilderTab() {
  const [mode, setMode] = useState<BuildMode>('every-minutes')
  const [minuteInterval, setMinuteInterval] = useState(10)
  const [hourInterval, setHourInterval] = useState(2)
  const [hourOffset, setHourOffset] = useState(0)
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)
  const [selectedDays, setSelectedDays] = useState<string[]>(['1', '2', '3', '4', '5'])
  const [monthDay, setMonthDay] = useState(1)
  const [customMin, setCustomMin] = useState('*')
  const [customHour, setCustomHour] = useState('*')
  const [customDom, setCustomDom] = useState('*')
  const [customMonth, setCustomMonth] = useState('*')
  const [customDow, setCustomDow] = useState('*')

  const { copy, copied } = useCopyToClipboard()

  const toggleDay = (v: string) => {
    setSelectedDays(prev => prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v].sort())
  }

  function buildExpression(): string {
    switch (mode) {
      case 'every-minutes':
        return minuteInterval === 1 ? '* * * * *' : `*/${minuteInterval} * * * *`
      case 'every-hours':
        return hourInterval === 1
          ? `${hourOffset} * * * *`
          : `${hourOffset} */${hourInterval} * * *`
      case 'daily':
        return `${minute} ${hour} * * *`
      case 'weekdays':
        return `${minute} ${hour} * * 1-5`
      case 'weekly': {
        const dow = selectedDays.length === 0 ? '*' : selectedDays.join(',')
        return `${minute} ${hour} * * ${dow}`
      }
      case 'monthly':
        return `${minute} ${hour} ${monthDay} * *`
      case 'custom':
        return `${customMin} ${customHour} ${customDom} ${customMonth} ${customDow}`
    }
  }

  const expression = buildExpression()
  const parsed = parseCron(expression)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="field">
        <label className="label">Tipo de periodicidade</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {BUILD_MODES.map(m => (
            <button
              key={m.value}
              className={`btn${mode === m.value ? ' primary' : ''}`}
              style={{ fontSize: 12 }}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }} />

      {mode === 'every-minutes' && (
        <div className="field">
          <label className="label">Intervalo em minutos</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range" min={1} max={59} value={minuteInterval}
              onChange={e => setMinuteInterval(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--accent)', minWidth: 32, textAlign: 'right' }}>
              {minuteInterval}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Executa a cada {minuteInterval} minuto{minuteInterval !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {mode === 'every-hours' && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label className="label">Intervalo em horas</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range" min={1} max={23} value={hourInterval}
                onChange={e => setHourInterval(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--accent)', minWidth: 32, textAlign: 'right' }}>
                {hourInterval}
              </span>
            </div>
          </div>
          <div className="field">
            <label className="label">No minuto</label>
            <input
              type="number" className="input" min={0} max={59} value={hourOffset}
              onChange={e => setHourOffset(Math.min(59, Math.max(0, Number(e.target.value))))}
              style={{ width: 80, fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>
      )}

      {(mode === 'daily' || mode === 'weekdays' || mode === 'weekly' || mode === 'monthly') && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field">
            <label className="label">Hora</label>
            <select
              className="select"
              value={hour}
              onChange={e => setHour(Number(e.target.value))}
              style={{ width: 100, fontFamily: 'var(--font-mono)' }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{pad2(i)}:00</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Minuto</label>
            <select
              className="select"
              value={minute}
              onChange={e => setMinute(Number(e.target.value))}
              style={{ width: 80, fontFamily: 'var(--font-mono)' }}
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                <option key={m} value={m}>{pad2(m)}</option>
              ))}
            </select>
          </div>
          {mode === 'monthly' && (
            <div className="field">
              <label className="label">Dia do mês</label>
              <input
                type="number" className="input" min={1} max={31} value={monthDay}
                onChange={e => setMonthDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                style={{ width: 80, fontFamily: 'var(--font-mono)' }}
              />
            </div>
          )}
        </div>
      )}

      {mode === 'weekly' && (
        <div className="field">
          <label className="label">Dias da semana</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {DOW_OPTIONS.map(d => (
              <button
                key={d.value}
                className={`btn${selectedDays.includes(d.value) ? ' primary' : ''}`}
                style={{ minWidth: 44, fontSize: 12 }}
                onClick={() => toggleDay(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Edite cada campo diretamente. Use <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>*</code> para qualquer valor,{' '}
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>/</code> para steps, <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>-</code> para ranges, <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>,</code> para listas.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Minuto', value: customMin, set: setCustomMin, hint: '0–59' },
              { label: 'Hora', value: customHour, set: setCustomHour, hint: '0–23' },
              { label: 'Dia do Mês', value: customDom, set: setCustomDom, hint: '1–31' },
              { label: 'Mês', value: customMonth, set: setCustomMonth, hint: '1–12' },
              { label: 'Dia da Semana', value: customDow, set: setCustomDow, hint: '0–6' },
            ].map(f => (
              <div key={f.label} className="field" style={{ minWidth: 90 }}>
                <label className="label">{f.label}</label>
                <input
                  className="input"
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.hint}
                  style={{ fontFamily: 'var(--font-mono)', textAlign: 'center' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="label">Expressão gerada</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--accent)', flex: 1, letterSpacing: '0.08em', wordBreak: 'break-all' }}>
            {expression}
          </span>
          <button className="btn ghost" style={{ padding: '4px 8px', flexShrink: 0 }} onClick={() => copy(expression)}>
            {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
          </button>
        </div>

        {parsed.isValid && (
          <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Em português
            </p>
            <p style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>
              {parsed.humanReadable}
            </p>
          </div>
        )}

        {parsed.isValid && parsed.fields.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {parsed.fields.map((f, i) => (
              <div key={i} style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 100, flex: 1 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{f.label}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{f.raw}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Reference Tab ────────────────────────────────────────────────────────────

const SPECIAL_CHARS = [
  { char: '*', name: 'Qualquer valor', desc: 'Representa todos os valores do campo. Ex: * no campo de horas = toda hora.' },
  { char: '?', name: 'Sem valor específico', desc: 'Usado em dom e dow quando apenas um deles é especificado (AWS/Quartz). Evita conflito.' },
  { char: '-', name: 'Range', desc: 'Define um intervalo. Ex: 1-5 no campo dow = segunda a sexta.' },
  { char: ',', name: 'Lista', desc: 'Define valores específicos. Ex: 1,3,5 no campo de horas = 1h, 3h e 5h.' },
  { char: '/', name: 'Step (passo)', desc: 'Define frequência dentro de um range. Ex: */15 nos minutos = a cada 15 minutos.' },
  { char: 'L', name: 'Last (último)', desc: 'No dom: último dia do mês. No dow: última ocorrência do dia. Ex: 5L = última sexta.' },
  { char: 'W', name: 'Weekday (dia útil)', desc: 'Dia útil mais próximo de uma data. Ex: 15W = dia útil mais próximo do dia 15.' },
  { char: '#', name: 'Nth weekday', desc: 'N-ésima ocorrência de um dia. Ex: 5#3 = 3ª sexta-feira do mês.' },
]

const FIELDS_TABLE = [
  { field: 'Minuto', values: '0–59', specials: '* , - /', aws: 'sim' },
  { field: 'Hora', values: '0–23', specials: '* , - /', aws: 'sim' },
  { field: 'Dia do mês', values: '1–31', specials: '* , - / ? L W', aws: 'sim' },
  { field: 'Mês', values: '1–12 ou JAN–DEC', specials: '* , - /', aws: 'sim' },
  { field: 'Dia da semana', values: '0–7 ou SUN–SAT', specials: '* , - / ? L #', aws: 'sim' },
  { field: 'Ano', values: '1970–2199', specials: '* , - /', aws: 'somente AWS' },
]

const EXAMPLES = [
  { expr: '* * * * *', desc: 'A cada minuto' },
  { expr: '*/15 * * * *', desc: 'A cada 15 minutos' },
  { expr: '0 * * * *', desc: 'A cada hora (no minuto 0)' },
  { expr: '30 9 * * *', desc: 'Todo dia às 09:30' },
  { expr: '0 8 * * 1-5', desc: 'De segunda a sexta às 08:00' },
  { expr: '0 0 1 * *', desc: 'No dia 1 de todo mês à meia-noite' },
  { expr: '0 9-18 * * 1-5', desc: 'A cada hora, das 9h às 18h, dias úteis' },
  { expr: '0 0 * * 0', desc: 'Todo domingo à meia-noite' },
  { expr: '0 0 L * *', desc: 'No último dia de todo mês' },
  { expr: '0 8 ? * MON-FRI *', desc: '(AWS) De segunda a sexta às 08:00, todo ano' },
  { expr: 'cron(0/10 * * * ? *)', desc: '(AWS) A cada 10 minutos' },
  { expr: 'rate(5 minutes)', desc: '(AWS) A cada 5 minutos' },
]

function ReferenceTab() {
  const [hoveredExpr, setHoveredExpr] = useState<string | null>(null)
  const [lastCopied, setLastCopied] = useState<string | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function copyExpr(expr: string) {
    navigator.clipboard.writeText(expr).then(() => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
      setLastCopied(expr)
      copyTimer.current = setTimeout(() => setLastCopied(null), 1500)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
          Uma expressão cron é composta de <strong>5 campos</strong> (ou 6 no formato AWS) separados por espaço, que definem
          quando uma tarefa deve ser executada. A ordem é:{' '}
          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 12 }}>minuto hora dia-do-mês mês dia-da-semana [ano]</code>
        </p>
      </div>

      <div>
        <p className="label" style={{ marginBottom: 8 }}>Campos da expressão</p>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr', background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '8px 14px', gap: 8 }}>
            {['Campo', 'Valores', 'Caracteres especiais', 'AWS'].map(h => (
              <span key={h} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{h}</span>
            ))}
          </div>
          {FIELDS_TABLE.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr',
                padding: '9px 14px', gap: 8,
                borderBottom: i < FIELDS_TABLE.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'var(--surface)' : 'transparent',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{row.field}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{row.values}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.04em' }}>{row.specials}</span>
              <span style={{ fontSize: 11, color: row.aws === 'somente AWS' ? 'var(--warning)' : 'var(--text-muted)' }}>{row.aws}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="label" style={{ marginBottom: 8 }}>Caracteres especiais</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SPECIAL_CHARS.map(sc => (
            <div key={sc.char} style={{ display: 'flex', gap: 14, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)', width: 28, flexShrink: 0, textAlign: 'center' }}>{sc.char}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{sc.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{sc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="label" style={{ marginBottom: 8 }}>Exemplos comuns</p>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {EXAMPLES.map((ex, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '9px 14px',
                borderBottom: i < EXAMPLES.length - 1 ? '1px solid var(--border)' : 'none',
                background: hoveredExpr === ex.expr ? 'var(--surface-2)' : i % 2 === 0 ? 'var(--surface)' : 'transparent',
                cursor: 'pointer',
                transition: 'background var(--tr)',
              }}
              onMouseEnter={() => setHoveredExpr(ex.expr)}
              onMouseLeave={() => setHoveredExpr(null)}
              onClick={() => copyExpr(ex.expr)}
              title="Clique para copiar"
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--accent)', fontWeight: 600, width: 200, flexShrink: 0 }}>
                {ex.expr}
              </span>
              <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-muted)' }}>{ex.desc}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
                {lastCopied === ex.expr ? '✓ copiado' : 'copiar'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const TAB_LABELS: Record<Tab, string> = {
  parser: 'Interpretar',
  builder: 'Construir',
  reference: 'Referência',
}

export default function CronParser() {
  const [tab, setTab] = useState<Tab>('parser')

  return (
    <ToolLayout
      name="Cron Parser"
      description="Interpreta, constrói e explica expressões cron — padrão e AWS"
      badge="formatter"
    >
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

      {tab === 'parser'    && <ParserTab />}
      {tab === 'builder'   && <BuilderTab />}
      {tab === 'reference' && <ReferenceTab />}
    </ToolLayout>
  )
}
