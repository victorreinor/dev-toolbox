import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { CodeEditor } from '../../components/CodeEditor'
import { OutputActions } from '../../components/OutputActions'
import { useToast } from '../../components/Toast'
import { useWorker } from '../../hooks/useWorker'

type DisplayMode = 'auto' | 'tabular' | 'expanded'

interface WorkerRequest {
  type: 'parse'
  text: string
  mode: DisplayMode
  nullEmpty: boolean
}

interface WorkerResponse {
  ok: boolean
  data?: Record<string, string | null>[]
  detectedMode?: 'tabular' | 'expanded'
  error?: string
}

const MODE_LABELS: Record<DisplayMode, string> = {
  auto: 'Auto-detectar',
  tabular: '\\x off (tabular)',
  expanded: '\\x on (expandido)',
}

export default function PsqlToJson() {
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [jsonOutput, setJsonOutput] = useState('')
  const [mode, setMode] = useState<DisplayMode>('auto')
  const [nullEmpty, setNullEmpty] = useState(true)
  const [processing, setProcessing] = useState(false)

  const { post } = useWorker<WorkerRequest, WorkerResponse>(
    () => new Worker(new URL('../../workers/psqlParser.worker.ts', import.meta.url), { type: 'module' }),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) {
          toast(res.error ?? 'Erro ao processar', 'error')
          return
        }
        const json = JSON.stringify(res.data, null, 2)
        setJsonOutput(json)
        const count = res.data?.length ?? 0
        const detected = res.detectedMode === 'expanded' ? '\\x on' : '\\x off'
        toast(`${count} registro(s) convertido(s) · ${detected}`, 'success')
      },
      onError: () => {
        setProcessing(false)
        toast('Erro inesperado no worker', 'error')
      },
    }
  )

  const convert = () => {
    if (!input.trim()) { toast('Cole a saída do psql para converter', 'error'); return }
    setProcessing(true)
    post({ type: 'parse', text: input, mode, nullEmpty })
  }

  return (
    <ToolLayout
      name="psql → JSON"
      description="Cole a saída do terminal PostgreSQL e converta para JSON"
      badge="converter"
    >
      <CodeEditor
        value={input}
        onChange={setInput}
        label="Saída do psql"
        placeholder={`Cole aqui a saída do SELECT no terminal:\n\n id | nome | cidade\n----+------+---------\n  1 | Ana  | SP\n(1 row)\n\nOu com \\x on:\n\n-[ RECORD 1 ]--\nid   | 1\nnome | Ana`}
        minHeight={220}
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ minWidth: 200 }}>
          <label className="label">Modo de exibição (\\x)</label>
          <select className="select" value={mode} onChange={e => setMode(e.target.value as DisplayMode)}>
            {(Object.keys(MODE_LABELS) as DisplayMode[]).map(m => (
              <option key={m} value={m}>{MODE_LABELS[m]}</option>
            ))}
          </select>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={nullEmpty} onChange={e => setNullEmpty(e.target.checked)} />
          Converter campos vazios em null
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={convert} disabled={processing}>
          {processing ? 'Convertendo…' : 'Converter'}
        </button>
        <OutputActions
          data={jsonOutput}
          filename="output.json"
          mimeType="application/json"
          onClear={() => { setJsonOutput(''); setInput('') }}
        />
      </div>

      {jsonOutput && (
        <CodeEditor value={jsonOutput} readOnly label="JSON" minHeight={220} />
      )}
    </ToolLayout>
  )
}
