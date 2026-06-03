import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Copy, Download, Building2, MapPin, Info } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToast } from '../../components/Toast'
import { generateCompany, companyToJson, type CompanyData } from './processor'

function cp(text: string, label: string, toast: (m: string, t: 'success' | 'error' | 'info') => void) {
  navigator.clipboard.writeText(text).then(() => toast(`${label} copiado!`, 'success'))
}

function FieldRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 12, width: 148, flexShrink: 0 }}>{label}</span>
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

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
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

export default function CompanyGenerator() {
  const { toast } = useToast()
  const [company, setCompany] = useState<CompanyData | null>(null)

  const generate = useCallback(() => setCompany(generateCompany()), [])

  useEffect(() => { generate() }, [generate])

  const c = (value: string, label: string) => cp(value, label, toast)

  const downloadJson = () => {
    if (!company) return
    const json = JSON.stringify(companyToJson(company), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `empresa-${company.cnpj.replace(/\D/g, '')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('JSON baixado!', 'success')
  }

  const copyJson = () => {
    if (!company) return
    navigator.clipboard
      .writeText(JSON.stringify(companyToJson(company), null, 2))
      .then(() => toast('JSON copiado!', 'success'))
  }

  return (
    <ToolLayout
      name="Gerador de Empresa"
      description="Dados fictícios de empresa brasileira para testes — CNPJ com dígitos verificadores válidos"
      badge="generator"
    >
      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={generate}>
          <RefreshCw size={14} />
          Gerar nova empresa
        </button>
        {company && (
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

      {company && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, width: '100%' }}>
          {/* Dados da Empresa */}
          <SectionCard icon={<Building2 size={15} />} title="Dados da Empresa">
            <FieldRow label="Razão Social" value={company.razaoSocial} onCopy={() => c(company.razaoSocial, 'Razão Social')} />
            <FieldRow label="Nome Fantasia" value={company.nomeFantasia} onCopy={() => c(company.nomeFantasia, 'Nome Fantasia')} />
            <FieldRow label="CNPJ" value={company.cnpj} onCopy={() => c(company.cnpj, 'CNPJ')} />
            <FieldRow label="Inscrição Estadual" value={company.inscricaoEstadual} onCopy={() => c(company.inscricaoEstadual, 'Inscrição Estadual')} />
            <FieldRow label="Situação" value={company.situacaoCadastral} onCopy={() => c(company.situacaoCadastral, 'Situação')} />
            <FieldRow label="Data de Abertura" value={company.dataAbertura} onCopy={() => c(company.dataAbertura, 'Data de Abertura')} />
            <FieldRow label="Capital Social" value={company.capitalSocial} onCopy={() => c(company.capitalSocial, 'Capital Social')} />
            <FieldRow label="Porte" value={`${company.porte.sigla} — ${company.porte.descricao}`} onCopy={() => c(company.porte.sigla, 'Porte')} />
          </SectionCard>

          {/* Endereço */}
          <SectionCard icon={<MapPin size={15} />} title="Endereço">
            <FieldRow label="CEP" value={company.endereco.cep} onCopy={() => c(company.endereco.cep, 'CEP')} />
            <FieldRow label="Logradouro" value={company.endereco.logradouro} onCopy={() => c(company.endereco.logradouro, 'Logradouro')} />
            <FieldRow label="Número" value={company.endereco.numero} onCopy={() => c(company.endereco.numero, 'Número')} />
            {company.endereco.complemento && (
              <FieldRow label="Complemento" value={company.endereco.complemento} onCopy={() => c(company.endereco.complemento, 'Complemento')} />
            )}
            <FieldRow label="Bairro" value={company.endereco.bairro} onCopy={() => c(company.endereco.bairro, 'Bairro')} />
            <FieldRow label="Cidade" value={company.endereco.cidade} onCopy={() => c(company.endereco.cidade, 'Cidade')} />
            <FieldRow label="UF" value={company.endereco.uf} onCopy={() => c(company.endereco.uf, 'UF')} />
            <FieldRow label="Estado" value={company.endereco.estado} onCopy={() => c(company.endereco.estado, 'Estado')} />
          </SectionCard>

          {/* Atividade + Contato */}
          <div style={{ gridColumn: '1 / -1' }}>
            <SectionCard icon={<Info size={15} />} title="Atividade e Contato">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0 24px' }}>
                <div>
                  <FieldRow label="Setor" value={company.setor} onCopy={() => c(company.setor, 'Setor')} />
                  <FieldRow label="Atividade Principal" value={company.atividadePrincipal} onCopy={() => c(company.atividadePrincipal, 'Atividade Principal')} />
                  <FieldRow label="CNAE Primário" value={company.cnaePrimario} onCopy={() => c(company.cnaePrimario, 'CNAE')} />
                  <FieldRow
                    label="Natureza Jurídica"
                    value={`${company.naturezaJuridica.codigo} — ${company.naturezaJuridica.descricao}`}
                    onCopy={() => c(`${company.naturezaJuridica.codigo} - ${company.naturezaJuridica.descricao}`, 'Natureza Jurídica')}
                  />
                </div>
                <div>
                  <FieldRow label="E-mail" value={company.email} onCopy={() => c(company.email, 'E-mail')} />
                  <FieldRow label="Telefone" value={company.telefone} onCopy={() => c(company.telefone, 'Telefone')} />
                  {company.site && (
                    <FieldRow label="Site" value={company.site} onCopy={() => c(company.site, 'Site')} />
                  )}
                </div>
              </div>
              <p style={{
                marginTop: 10, fontSize: 11, color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)', lineHeight: 1.5,
              }}>
                ⚠ Dados fictícios para teste. O CNPJ tem dígitos verificadores válidos (algoritmo real), mas não corresponde a nenhuma empresa real. CEP e IE são formatados conforme o estado, mas podem não existir.
              </p>
            </SectionCard>
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
