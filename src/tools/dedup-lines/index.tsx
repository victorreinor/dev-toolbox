import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { CodeEditor } from '../../components/CodeEditor'
import { OutputActions } from '../../components/OutputActions'
import { useToast } from '../../components/Toast'
import { useWorker } from '../../hooks/useWorker'

interface WorkerRequest {
  type: 'dedup'
  text: string
  caseSensitive: boolean
  ignoreBlank: boolean
  trimLines: boolean
}

interface WorkerResponse {
  ok: boolean
  result?: string
  removedCount?: number
  error?: string
}

export default function DedupLines() {
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(true)
  const [ignoreBlank, setIgnoreBlank] = useState(true)
  const [trimLines, setTrimLines] = useState(false)
  const [processing, setProcessing] = useState(false)

  const { post } = useWorker<WorkerRequest, WorkerResponse>(
    () => new Worker(new URL('../../workers/dedupLines.worker.ts', import.meta.url), { type: 'module' }),
    {
      onMessage: (res) => {
        setProcessing(false)
        if (!res.ok) {
          toast(res.error ?? 'Erro ao processar', 'error')
          return
        }
        setOutput(res.result ?? '')
        const removed = res.removedCount ?? 0
        if (removed === 0) {
          toast('Nenhuma duplicata encontrada', 'success')
        } else {
          toast(`${removed} linha(s) duplicada(s) removida(s)`, 'success')
        }
      },
      onError: () => {
        setProcessing(false)
        toast('Erro inesperado no worker', 'error')
      },
    }
  )

  const process = () => {
    if (!input.trim()) { toast('Cole o texto para processar', 'error'); return }
    setOutput('')
    setProcessing(true)
    post({ type: 'dedup', text: input, caseSensitive, ignoreBlank, trimLines })
  }

  return (
    <ToolLayout
      name="Remover Duplicatas"
      description="Remove linhas duplicadas de um texto, mantendo a primeira ocorrência"
      badge="formatter"
    >
      <CodeEditor
        value={input}
        onChange={setInput}
        label="Texto de entrada"
        placeholder={'Cole aqui o texto com linhas duplicadas:\n\nmaçã\nbanana\nmaçã\nlaranja\nbanana'}
        minHeight={220}
      />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="checkbox-label">
          <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />
          Diferenciar maiúsculas/minúsculas
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={ignoreBlank} onChange={e => setIgnoreBlank(e.target.checked)} />
          Preservar linhas em branco
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={trimLines} onChange={e => setTrimLines(e.target.checked)} />
          Ignorar espaços nas bordas
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={process} disabled={processing}>
          {processing ? 'Processando…' : 'Remover Duplicatas'}
        </button>
        <OutputActions
          data={output}
          filename="output.txt"
          mimeType="text/plain"
          onClear={() => { setOutput(''); setInput('') }}
        />
      </div>

      {output && (
        <CodeEditor value={output} readOnly label="Resultado" minHeight={220} />
      )}
    </ToolLayout>
  )
}
