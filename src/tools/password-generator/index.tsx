import { useState, useCallback } from 'react'
import { RefreshCw, Copy, Check, Trash2, Eye, EyeOff } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { DownloadButton } from '../../components/DownloadButton'
import { useToast } from '../../components/Toast'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

const CHARS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  ambiguous: 'l1I0O',
}

type StrengthLevel = 'Muito fraca' | 'Fraca' | 'Razoável' | 'Forte' | 'Muito forte'

function calcEntropy(length: number, poolSize: number): number {
  if (poolSize === 0) return 0
  return Math.round(length * Math.log2(poolSize))
}

function getStrength(bits: number): { level: StrengthLevel; color: string; pct: number } {
  if (bits < 40)  return { level: 'Muito fraca', color: '#ff4545', pct: 15 }
  if (bits < 60)  return { level: 'Fraca',       color: '#f5a623', pct: 35 }
  if (bits < 80)  return { level: 'Razoável',    color: '#f5e623', pct: 55 }
  if (bits < 100) return { level: 'Forte',       color: '#4afa7b', pct: 78 }
  return            { level: 'Muito forte',   color: '#4afa7b', pct: 100 }
}

function buildPool(
  useLower: boolean,
  useUpper: boolean,
  useDigits: boolean,
  useSymbols: boolean,
  customSymbols: string,
  excludeAmbiguous: boolean,
): string {
  let pool = ''
  if (useLower)   pool += CHARS.lower
  if (useUpper)   pool += CHARS.upper
  if (useDigits)  pool += CHARS.digits
  if (useSymbols) pool += (customSymbols || CHARS.symbols)
  if (excludeAmbiguous) pool = pool.split('').filter(c => !CHARS.ambiguous.includes(c)).join('')
  return pool
}

function maskPassword(pw: string) { return '•'.repeat(pw.length) }

function generatePassword(length: number, pool: string): string {
  if (!pool) return ''
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, n => pool[n % pool.length]).join('')
}

export default function PasswordGenerator() {
  const { toast } = useToast()
  const { copy, copied } = useCopyToClipboard()
  const [length, setLength] = useState(16)
  const [useLower, setUseLower] = useState(true)
  const [useUpper, setUseUpper] = useState(true)
  const [useDigits, setUseDigits] = useState(true)
  const [useSymbols, setUseSymbols] = useState(true)
  const [customSymbols, setCustomSymbols] = useState('')
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [passwords, setPasswords] = useState<string[]>([])
  const [showPasswords, setShowPasswords] = useState(true)

  const pool = buildPool(useLower, useUpper, useDigits, useSymbols, customSymbols, excludeAmbiguous)
  const poolSize = pool.length

  const entropy = calcEntropy(length, poolSize)
  const strength = getStrength(entropy)

  const generate = useCallback(() => {
    const currentPool = buildPool(useLower, useUpper, useDigits, useSymbols, customSymbols, excludeAmbiguous)
    if (!currentPool) {
      toast('Selecione ao menos um tipo de caractere', 'error')
      return
    }
    const count = Math.min(Math.max(1, quantity), 1000)
    const newPasswords = Array.from({ length: count }, () => generatePassword(length, currentPool))
    setPasswords(newPasswords)
    if (count === 1) toast('Senha gerada!', 'success')
    else toast(`${count} senhas geradas!`, 'success')
  }, [length, useLower, useUpper, useDigits, useSymbols, customSymbols, excludeAmbiguous, quantity, toast])

  const allText = passwords.join('\n')

  return (
    <ToolLayout
      name="Gerador de Senha"
      description="Gere senhas fortes e personalizáveis com análise de entropia"
      badge="generator"
    >
      {/* Length slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="label">Comprimento</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{length}</span>
        </div>
        <input
          type="range"
          min={4}
          max={128}
          value={length}
          onChange={e => setLength(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>4</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>128</span>
        </div>
      </div>

      {/* Strength meter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: strength.color, fontWeight: 600 }}>{strength.level}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{entropy} bits de entropia</span>
        </div>
        <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${strength.pct}%`, background: strength.color, borderRadius: 2, transition: 'width 0.3s ease, background 0.3s ease' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Pool: {poolSize} caracteres → {poolSize > 0 ? `${poolSize}^${length} combinações` : 'selecione caracteres'}
        </span>
      </div>

      {/* Character sets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="label">Tipos de caracteres</span>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label className="checkbox-label">
            <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} />
            <span>Minúsculas <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>(a-z)</span></span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} />
            <span>Maiúsculas <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>(A-Z)</span></span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={useDigits} onChange={e => setUseDigits(e.target.checked)} />
            <span>Números <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>(0-9)</span></span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} />
            <span>Símbolos <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>(!@#$…)</span></span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={excludeAmbiguous} onChange={e => setExcludeAmbiguous(e.target.checked)} />
            <span>Excluir ambíguos <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>(l,1,I,0,O)</span></span>
          </label>
        </div>

        {useSymbols && (
          <div className="field">
            <label className="label">Símbolos personalizados (deixe vazio para usar o padrão)</label>
            <input
              className="input"
              value={customSymbols}
              onChange={e => setCustomSymbols(e.target.value)}
              placeholder={CHARS.symbols}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </div>
        )}
      </div>

      {/* Quantity & actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field">
          <label className="label">Quantidade</label>
          <input
            className="input"
            type="number"
            min={1}
            max={1000}
            value={quantity}
            onChange={e => setQuantity(Math.min(1000, Math.max(1, Number(e.target.value))))}
            style={{ width: 100 }}
          />
        </div>
        <button className="btn primary" onClick={generate}>
          <RefreshCw size={14} />
          Gerar
        </button>
        {passwords.length > 0 && (
          <>
            <button className="btn" onClick={() => copy(allText)}>
              {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
              {copied ? 'Copiado!' : 'Copiar todas'}
            </button>
            <DownloadButton data={allText} filename="senhas.txt" mimeType="text/plain" label="Baixar .txt" />
            <button className="btn ghost" style={{ padding: '6px 8px' }} onClick={() => setShowPasswords(v => !v)} title={showPasswords ? 'Ocultar' : 'Mostrar'}>
              {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button className="btn ghost" style={{ padding: '6px 8px' }} onClick={() => setPasswords([])} title="Limpar">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      {/* Results */}
      {passwords.length > 0 && (
        <div>
          <span className="label">{passwords.length} senha(s) gerada(s)</span>
          <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
            {passwords.map((pw, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', transition: 'background var(--tr)' }}>
                <span
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', letterSpacing: showPasswords ? '0.05em' : '0.1em', userSelect: showPasswords ? 'all' : 'none' }}
                >
                  {showPasswords ? pw : maskPassword(pw)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>{pw.length} chars</span>
                <button
                  className="btn ghost"
                  style={{ padding: '2px 6px', flexShrink: 0 }}
                  onClick={() => navigator.clipboard.writeText(pw).then(() => toast('Copiado!', 'success'))}
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
