import { useState } from 'react'
import { v1, v4, v5, v7 } from 'uuid'
import { RefreshCw, Copy, Trash2 } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { DownloadButton } from '../../components/DownloadButton'
import { useToast } from '../../components/Toast'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

type UuidVersion = 'v1' | 'v4' | 'v5' | 'v7'

const NAMESPACES: Record<string, string> = {
  DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
}

const VERSION_INFO: Record<UuidVersion, string> = {
  v1: 'Baseado em tempo e MAC address',
  v4: 'Completamente aleatório (mais comum)',
  v5: 'Hash SHA-1 de namespace + nome',
  v7: 'Baseado em tempo Unix (ordenável)',
}

function formatUuid(uuid: string, upper: boolean, noDashes: boolean): string {
  let result = upper ? uuid.toUpperCase() : uuid
  if (noDashes) result = result.replace(/-/g, '')
  return result
}

export default function UuidGenerator() {
  const { toast } = useToast()
  const { copy, copied } = useCopyToClipboard()
  const [version, setVersion] = useState<UuidVersion>('v4')
  const [quantity, setQuantity] = useState(10)
  const [uppercase, setUppercase] = useState(false)
  const [noDashes, setNoDashes] = useState(false)
  const [namespace, setNamespace] = useState('DNS')
  const [customNamespace, setCustomNamespace] = useState('')
  const [v5Name, setV5Name] = useState('')
  const [results, setResults] = useState<string[]>([])

  const generate = () => {
    const count = Math.min(Math.max(1, quantity), 1000)
    let uuids: string[] = []

    try {
      if (version === 'v5') {
        const ns = namespace === 'custom' ? customNamespace : NAMESPACES[namespace]
        if (!ns) { toast('Namespace inválido', 'error'); return }
        if (!v5Name.trim()) { toast('Informe um nome para v5', 'error'); return }
        // v5 is deterministic: same name+namespace always produces the same UUID
        uuids = [v5(v5Name, ns)]
      } else if (version === 'v1') {
        uuids = Array.from({ length: count }, () => v1())
      } else if (version === 'v7') {
        uuids = Array.from({ length: count }, () => v7())
      } else {
        uuids = Array.from({ length: count }, () => v4())
      }
    } catch (err) {
      toast(String(err), 'error')
      return
    }

    setResults(uuids.map(u => formatUuid(u, uppercase, noDashes)))
    toast(`${uuids.length} UUID(s) gerado(s)!`, 'success')
  }

  const allText = results.join('\n')

  return (
    <ToolLayout
      name="UUID Generator"
      description="Gere UUIDs em todas as versões com suporte a lote"
      badge="generator"
    >
      {/* Version selector */}
      <div>
        <span className="label">Versão</span>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {(['v1', 'v4', 'v5', 'v7'] as UuidVersion[]).map(v => (
            <button
              key={v}
              className={`btn${version === v ? ' primary' : ' ghost'}`}
              onClick={() => setVersion(v)}
              style={{ minWidth: 56 }}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {VERSION_INFO[version]}
          {version === 'v5' && <span style={{ color: 'var(--warning)', marginLeft: 8 }}>— determinístico: mesmo nome sempre gera o mesmo UUID</span>}
        </p>
      </div>

      {/* v5 options */}
      {version === 'v5' && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label className="label">Namespace</label>
            <select className="select" value={namespace} onChange={e => setNamespace(e.target.value)}>
              {Object.keys(NAMESPACES).map(n => <option key={n} value={n}>{n}</option>)}
              <option value="custom">Customizado</option>
            </select>
          </div>
          {namespace === 'custom' && (
            <div className="field" style={{ flex: 2, minWidth: 240 }}>
              <label className="label">UUID do namespace</label>
              <input
                className="input"
                value={customNamespace}
                onChange={e => setCustomNamespace(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
            </div>
          )}
          <div className="field" style={{ flex: 2, minWidth: 200 }}>
            <label className="label">Nome</label>
            <input
              className="input"
              value={v5Name}
              onChange={e => setV5Name(e.target.value)}
              placeholder="Texto para gerar o UUID"
            />
          </div>
        </div>
      )}

      {/* Options */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field">
          <label className="label">Quantidade (máx. 1000)</label>
          <input
            className="input"
            type="number"
            min={1}
            max={1000}
            value={quantity}
            disabled={version === 'v5'}
            title={version === 'v5' ? 'v5 é determinístico — quantidade fixa em 1' : undefined}
            onChange={e => setQuantity(Math.min(1000, Math.max(1, Number(e.target.value))))}
            style={{ width: 100 }}
          />
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={uppercase} onChange={e => setUppercase(e.target.checked)} />
          MAIÚSCULAS
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={noDashes} onChange={e => setNoDashes(e.target.checked)} />
          Sem hífens
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={generate}>
          <RefreshCw size={14} />
          Gerar {version === 'v5' ? '1 UUID' : quantity === 1 ? '1 UUID' : `${quantity} UUIDs`}
        </button>
        {results.length > 0 && (
          <>
            <button className="btn" onClick={() => copy(allText)}>
              <Copy size={14} />
              {copied ? 'Copiado!' : 'Copiar todos'}
            </button>
            <DownloadButton data={allText} filename={`uuids-${version}.txt`} mimeType="text/plain" label="Baixar .txt" />
            <button className="btn ghost" onClick={() => setResults([])}>
              <Trash2 size={14} /> Limpar
            </button>
          </>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <span className="label">{results.length} UUID(s) gerado(s)</span>
          <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
            {results.map((uuid, i) => (
              <UuidRow key={i} uuid={uuid} onCopy={() => navigator.clipboard.writeText(uuid).then(() => toast('Copiado!', 'success'))} />
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  )
}

function UuidRow({ uuid, onCopy }: { uuid: string; onCopy: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid var(--border)', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', letterSpacing: '0.02em', userSelect: 'all' }}>
        {uuid}
      </span>
      <button className="btn ghost" style={{ padding: '2px 6px', flexShrink: 0 }} onClick={onCopy}>
        <Copy size={11} />
      </button>
    </div>
  )
}
