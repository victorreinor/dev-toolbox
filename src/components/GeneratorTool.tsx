import { useState } from 'react'
import { RefreshCw, Copy, Check } from 'lucide-react'
import { ToolLayout } from './ToolLayout'
import { DownloadButton } from './DownloadButton'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { useToast } from './Toast'

interface GeneratorToolProps {
  name: string
  description: string
  formatLabel: string
  generate: (count: number, formatted: boolean) => string[]
  filename: string
}

export function GeneratorTool({ name, description, formatLabel, generate, filename }: GeneratorToolProps) {
  const { toast } = useToast()
  const { copy: copyAll, copied } = useCopyToClipboard()
  const [count, setCount] = useState(10)
  const [formatted, setFormatted] = useState(true)
  const [outputFormat, setOutputFormat] = useState<'txt' | 'json'>('txt')
  const [results, setResults] = useState<string[]>([])

  const outputText = outputFormat === 'json'
    ? JSON.stringify(results, null, 2)
    : results.join('\n')

  return (
    <ToolLayout name={name} description={description} badge="generator">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field">
          <label className="label">Quantidade</label>
          <input
            className="input"
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={e => setCount(Math.min(1000, Math.max(1, Number(e.target.value))))}
            style={{ width: 100 }}
          />
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={formatted} onChange={e => setFormatted(e.target.checked)} />
          {formatLabel}
        </label>
        <div className="field">
          <label className="label">Download como</label>
          <select className="select" value={outputFormat} onChange={e => setOutputFormat(e.target.value as 'txt' | 'json')}>
            <option value="txt">.txt</option>
            <option value="json">.json</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={() => setResults(generate(count, formatted))}>
          <RefreshCw size={14} />
          Gerar {count}
        </button>
        <button className="btn" onClick={() => setResults(prev => [...generate(1, formatted), ...prev].slice(0, 1000))}>
          + 1
        </button>
        {results.length > 0 && (
          <>
            <button className="btn" onClick={() => copyAll(outputText)}>
              {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
              {copied ? 'Copiado!' : 'Copiar tudo'}
            </button>
            <DownloadButton
              data={outputText}
              filename={`${filename}.${outputFormat}`}
              mimeType={outputFormat === 'json' ? 'application/json' : 'text/plain'}
              label={`Baixar .${outputFormat}`}
            />
            <button className="btn ghost" onClick={() => setResults([])}>Limpar</button>
          </>
        )}
      </div>

      {results.length > 0 && (
        <div>
          <span className="label">{results.length} resultado(s)</span>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginTop: 8, maxHeight: 360, overflowY: 'auto' }}>
            {results.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid var(--border)' }}>
                <span className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>{item}</span>
                <button
                  className="btn ghost"
                  style={{ padding: '2px 6px', fontSize: 11 }}
                  onClick={() => navigator.clipboard.writeText(item).then(() => toast('Copiado!', 'success'))}
                >
                  <Copy size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
