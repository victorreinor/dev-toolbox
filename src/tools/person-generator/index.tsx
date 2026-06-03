import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Copy, Download, User, CreditCard, MapPin } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToast } from '../../components/Toast'
import { generatePerson, personToJson, type PersonData } from './processor'

function copyText(text: string, label: string, toast: (msg: string, type: 'success' | 'error' | 'info') => void) {
  navigator.clipboard.writeText(text).then(() => toast(`${label} copiado!`, 'success'))
}

function FieldRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 12, width: 120, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)',
        flex: 1, wordBreak: 'break-word',
      }}>{value}</span>
      <button
        className="btn ghost"
        style={{ padding: '2px 6px', flexShrink: 0 }}
        onClick={onCopy}
        title="Copiar"
      >
        <Copy size={11} />
      </button>
    </div>
  )
}

function SectionCard({
  icon, title, children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

export default function PersonGenerator() {
  const { toast } = useToast()
  const [person, setPerson] = useState<PersonData | null>(null)

  const generate = useCallback(() => {
    setPerson(generatePerson())
  }, [])

  useEffect(() => { generate() }, [generate])

  const cp = (value: string, label: string) => copyText(value, label, toast)

  const downloadJson = () => {
    if (!person) return
    const json = JSON.stringify(personToJson(person), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pessoa-${person.cpf.replace(/\D/g, '')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('JSON baixado!', 'success')
  }

  const copyJson = () => {
    if (!person) return
    const json = JSON.stringify(personToJson(person), null, 2)
    navigator.clipboard.writeText(json).then(() => toast('JSON copiado!', 'success'))
  }

  return (
    <ToolLayout
      name="Gerador de Pessoa"
      description="Dados fictícios de pessoa brasileira para testes — CPF e cartão com dígitos verificadores válidos"
      badge="generator"
    >
      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={generate}>
          <RefreshCw size={14} />
          Gerar nova pessoa
        </button>
        {person && (
          <>
            <button className="btn" onClick={copyJson}>
              <Copy size={14} />
              Copiar JSON
            </button>
            <button className="btn" onClick={downloadJson}>
              <Download size={14} />
              Baixar JSON
            </button>
          </>
        )}
      </div>

      {person && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, width: '100%' }}>
          {/* Dados Pessoais */}
          <SectionCard icon={<User size={15} />} title="Dados Pessoais">
            <FieldRow label="Nome" value={person.nome} onCopy={() => cp(person.nome, 'Nome')} />
            <FieldRow label="Sobrenome" value={person.sobrenome} onCopy={() => cp(person.sobrenome, 'Sobrenome')} />
            <FieldRow label="Nome completo" value={person.nomeCompleto} onCopy={() => cp(person.nomeCompleto, 'Nome completo')} />
            <FieldRow label="Sexo" value={person.sexo === 'M' ? 'Masculino' : 'Feminino'} onCopy={() => cp(person.sexo === 'M' ? 'Masculino' : 'Feminino', 'Sexo')} />
            <FieldRow label="CPF" value={person.cpf} onCopy={() => cp(person.cpf, 'CPF')} />
            <FieldRow label="RG" value={person.rg} onCopy={() => cp(person.rg, 'RG')} />
            <FieldRow label="E-mail" value={person.email} onCopy={() => cp(person.email, 'E-mail')} />
            <FieldRow label="Telefone" value={person.telefone} onCopy={() => cp(person.telefone, 'Telefone')} />
            <FieldRow
              label="Nascimento"
              value={`${person.nascimento} (${person.idade} anos)`}
              onCopy={() => cp(person.nascimento, 'Data de nascimento')}
            />
          </SectionCard>

          {/* Endereço */}
          <SectionCard icon={<MapPin size={15} />} title="Endereço">
            <FieldRow label="CEP" value={person.endereco.cep} onCopy={() => cp(person.endereco.cep, 'CEP')} />
            <FieldRow label="Logradouro" value={person.endereco.logradouro} onCopy={() => cp(person.endereco.logradouro, 'Logradouro')} />
            <FieldRow label="Número" value={person.endereco.numero} onCopy={() => cp(person.endereco.numero, 'Número')} />
            <FieldRow label="Bairro" value={person.endereco.bairro} onCopy={() => cp(person.endereco.bairro, 'Bairro')} />
            <FieldRow label="Cidade" value={person.endereco.cidade} onCopy={() => cp(person.endereco.cidade, 'Cidade')} />
            <FieldRow label="UF" value={person.endereco.uf} onCopy={() => cp(person.endereco.uf, 'UF')} />
            <FieldRow label="Estado" value={person.endereco.estado} onCopy={() => cp(person.endereco.estado, 'Estado')} />
            <FieldRow
              label="Endereço completo"
              value={`${person.endereco.logradouro}, ${person.endereco.numero} — ${person.endereco.bairro}, ${person.endereco.cidade}/${person.endereco.uf}`}
              onCopy={() => cp(
                `${person.endereco.logradouro}, ${person.endereco.numero} — ${person.endereco.bairro}, ${person.endereco.cidade}/${person.endereco.uf}`,
                'Endereço completo',
              )}
            />
          </SectionCard>

          {/* Cartão de Crédito */}
          <div style={{ gridColumn: '1 / -1' }}>
            <SectionCard icon={<CreditCard size={15} />} title="Cartão de Crédito">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0 24px' }}>
                <div>
                  <FieldRow label="Número" value={person.cartao.numero} onCopy={() => cp(person.cartao.numero, 'Número do cartão')} />
                  <FieldRow label="Bandeira" value={person.cartao.bandeira} onCopy={() => cp(person.cartao.bandeira, 'Bandeira')} />
                </div>
                <div>
                  <FieldRow label="Validade" value={person.cartao.validade} onCopy={() => cp(person.cartao.validade, 'Validade')} />
                  <FieldRow label="CVV" value={person.cartao.cvv} onCopy={() => cp(person.cartao.cvv, 'CVV')} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FieldRow label="Titular" value={person.cartao.titular} onCopy={() => cp(person.cartao.titular, 'Titular')} />
                </div>
              </div>
              <p style={{
                marginTop: 10, fontSize: 11, color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)', lineHeight: 1.5,
              }}>
                ⚠ Dados fictícios para teste. CPF e cartão têm dígitos verificadores válidos (algoritmo real), mas não correspondem a pessoas ou contas reais. O CEP segue a faixa do estado, mas pode não existir.
              </p>
            </SectionCard>
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
