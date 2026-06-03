function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// --- CNPJ ---
function generateCNPJ(): string {
  const base = Array.from({ length: 8 }, () => randInt(0, 9))
  const branch = [0, 0, 0, 1]
  const all12 = [...base, ...branch]
  const calc = (digits: number[], ws: number[]) => {
    const rem = digits.reduce((a, d, i) => a + d * ws[i], 0) % 11
    return rem < 2 ? 0 : 11 - rem
  }
  const d1 = calc(all12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = calc([...all12, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const raw = [...all12, d1, d2].join('')
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`
}

// --- Inscrição Estadual (formato genérico por UF) ---
function generateIE(uf: string): string {
  const d = () => randInt(0, 9)
  switch (uf) {
    case 'SP': {
      const n = Array.from({ length: 8 }, d)
      return `${n.slice(0, 3).join('')}.${n.slice(3, 6).join('')}.${n.slice(6).join('')}/000`
    }
    case 'RJ': return `${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}-${d()}`
    case 'MG': return `${d()}${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}/${d()}${d()}${d()}${d()}`
    case 'RS': return `${d()}${d()}${d()}/${d()}${d()}${d()}${d()}${d()}${d()}${d()}`
    case 'PR': return `${d()}${d()}${d()}.${d()}${d()}${d()}-${d()}${d()}`
    case 'SC': return `${d()}${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}`
    case 'BA': return `${d()}${d()}${d()}${d()}${d()}${d()}${d()}-${d()}${d()}`
    case 'CE': return `${d()}${d()}${d()}${d()}${d()}${d()}${d()}-${d()}`
    case 'PE': return `${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}${d()}-${d()}`
    case 'DF': return `${d()}${d()}${d()}${d()}${d()}${d()}${d()}${d()}${d()}${d()}${d()}-${d()}${d()}`
    case 'GO': return `${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}-${d()}`
    default:   return Array.from({ length: 9 }, d).join('') + '-' + d()
  }
}

// --- Segmentos ---
interface Segment {
  setor: string
  atividades: string[]
  cnaePrimario: string
  sufixos: string[]
}

const SEGMENTS: Segment[] = [
  {
    setor: 'Tecnologia da Informação',
    atividades: ['Desenvolvimento de Software', 'Consultoria em TI', 'Suporte de Sistemas', 'Segurança da Informação', 'Análise de Dados'],
    cnaePrimario: '6201-5/01',
    sufixos: ['Tech', 'Systems', 'Digital', 'Solutions', 'Labs', 'Soft', 'Dev', 'Cloud', 'Data', 'Net'],
  },
  {
    setor: 'Comércio Varejista',
    atividades: ['Comércio de Produtos Eletrônicos', 'Comércio de Vestuário', 'Comércio de Alimentos', 'Comércio de Artigos do Lar'],
    cnaePrimario: '4751-2/01',
    sufixos: ['Comércio', 'Store', 'Shop', 'Market', 'Varejo', 'Emporium', 'Distribuidora'],
  },
  {
    setor: 'Construção Civil',
    atividades: ['Construção de Edifícios', 'Obras de Infraestrutura', 'Reformas e Manutenção', 'Instalações Elétricas'],
    cnaePrimario: '4120-4/00',
    sufixos: ['Construtora', 'Engenharia', 'Obras', 'Construções', 'Incorporadora', 'Edificações'],
  },
  {
    setor: 'Saúde',
    atividades: ['Clínica Médica', 'Laboratório de Análises', 'Fisioterapia', 'Odontologia', 'Farmácia'],
    cnaePrimario: '8630-5/01',
    sufixos: ['Saúde', 'Clínica', 'Med', 'Health', 'Vita', 'Salus', 'Care', 'Clinic'],
  },
  {
    setor: 'Educação',
    atividades: ['Ensino Fundamental', 'Ensino Técnico', 'Cursos Livres', 'Educação à Distância', 'Idiomas'],
    cnaePrimario: '8513-9/00',
    sufixos: ['Educação', 'Ensino', 'Academy', 'Instituto', 'Centro Educacional', 'School', 'Cursos'],
  },
  {
    setor: 'Transporte e Logística',
    atividades: ['Transporte Rodoviário de Cargas', 'Logística e Armazenagem', 'Transporte de Passageiros', 'Courier Expresso'],
    cnaePrimario: '4930-2/01',
    sufixos: ['Transportes', 'Logística', 'Log', 'Express', 'Cargo', 'Frete', 'Delivery'],
  },
  {
    setor: 'Alimentação',
    atividades: ['Restaurante', 'Lanchonete', 'Indústria de Alimentos', 'Catering', 'Padaria'],
    cnaePrimario: '5611-2/01',
    sufixos: ['Alimentos', 'Food', 'Restaurante', 'Gastronomia', 'Chef', 'Sabor', 'Culinária'],
  },
  {
    setor: 'Consultoria e Serviços',
    atividades: ['Consultoria Empresarial', 'Assessoria Contábil', 'Assessoria Jurídica', 'Recursos Humanos', 'Marketing'],
    cnaePrimario: '7020-4/00',
    sufixos: ['Consultoria', 'Assessoria', 'Gestão', 'Partners', 'Group', 'Soluções', 'Business'],
  },
  {
    setor: 'Indústria',
    atividades: ['Fabricação de Peças Metálicas', 'Fabricação de Plásticos', 'Fabricação de Móveis', 'Têxtil'],
    cnaePrimario: '2599-3/99',
    sufixos: ['Indústria', 'Industrial', 'Manufatura', 'Fábrica', 'Metalúrgica', 'Produção'],
  },
  {
    setor: 'Agronegócio',
    atividades: ['Produção de Grãos', 'Pecuária', 'Agroindústria', 'Irrigação e Insumos'],
    cnaePrimario: '0111-3/01',
    sufixos: ['Agro', 'Agrícola', 'Rural', 'Agropecuária', 'Campo', 'Fazenda', 'Grãos'],
  },
]

// --- Nomes de empresa ---
const PREFIXES = [
  'Alpha', 'Beta', 'Prime', 'Master', 'Max', 'Pro', 'Top', 'Super', 'Global', 'Nacional',
  'Mega', 'Ultra', 'Fast', 'Smart', 'Novo', 'Nova', 'Grand', 'Premium', 'Plus', 'Neo',
  'Inter', 'Multi', 'Uni', 'Tri', 'Centro', 'Sul', 'Norte', 'Leste', 'Oeste', 'Brasil',
  'Rio', 'São', 'Serra', 'Vale', 'Costa', 'Porto', 'Terra', 'Vivo', 'Forte', 'Ágil',
]

const MIDNAMES = [
  'Silva', 'Santos', 'Costa', 'Souza', 'Pereira', 'Almeida', 'Ferreira', 'Carvalho',
  'Lima', 'Ribeiro', 'Martins', 'Oliveira', 'Rocha', 'Mendes', 'Campos', 'Borges',
]

const NATURE_OPTIONS = [
  { codigo: '206-2', descricao: 'Sociedade Empresária Limitada (LTDA)' },
  { codigo: '230-5', descricao: 'Empresário Individual (EI)' },
  { codigo: '213-5', descricao: 'Sociedade Anônima Fechada (S.A.)' },
  { codigo: '231-3', descricao: 'Empresa Individual de Responsabilidade Limitada (EIRELI)' },
  { codigo: '303-4', descricao: 'Microempreendedor Individual (MEI)' },
]

const PORTE_OPTIONS = [
  { sigla: 'MEI', descricao: 'Microempreendedor Individual' },
  { sigla: 'ME', descricao: 'Microempresa' },
  { sigla: 'EPP', descricao: 'Empresa de Pequeno Porte' },
  { sigla: 'MP', descricao: 'Empresa de Médio Porte' },
  { sigla: 'GE', descricao: 'Grande Empresa' },
]

const EMAIL_DOMAINS_CORP = ['gmail.com', 'outlook.com', 'hotmail.com', 'uol.com.br', 'terra.com.br']

// --- Endereço (mesma base do person-generator) ---
interface CityEntry {
  cidade: string
  uf: string
  estado: string
  cepMin: number
  cepMax: number
  ddd: string
}

const CITIES: CityEntry[] = [
  { cidade: 'São Paulo', uf: 'SP', estado: 'São Paulo', cepMin: 1000000, cepMax: 5999999, ddd: '11' },
  { cidade: 'Campinas', uf: 'SP', estado: 'São Paulo', cepMin: 13010000, cepMax: 13099999, ddd: '19' },
  { cidade: 'Santos', uf: 'SP', estado: 'São Paulo', cepMin: 11010000, cepMax: 11099999, ddd: '13' },
  { cidade: 'Ribeirão Preto', uf: 'SP', estado: 'São Paulo', cepMin: 14010000, cepMax: 14099999, ddd: '16' },
  { cidade: 'Rio de Janeiro', uf: 'RJ', estado: 'Rio de Janeiro', cepMin: 20010000, cepMax: 23999999, ddd: '21' },
  { cidade: 'Niterói', uf: 'RJ', estado: 'Rio de Janeiro', cepMin: 24010000, cepMax: 24999999, ddd: '21' },
  { cidade: 'Belo Horizonte', uf: 'MG', estado: 'Minas Gerais', cepMin: 30110000, cepMax: 31999999, ddd: '31' },
  { cidade: 'Uberlândia', uf: 'MG', estado: 'Minas Gerais', cepMin: 38400000, cepMax: 38499999, ddd: '34' },
  { cidade: 'Porto Alegre', uf: 'RS', estado: 'Rio Grande do Sul', cepMin: 90010000, cepMax: 91999999, ddd: '51' },
  { cidade: 'Caxias do Sul', uf: 'RS', estado: 'Rio Grande do Sul', cepMin: 95010000, cepMax: 95099999, ddd: '54' },
  { cidade: 'Curitiba', uf: 'PR', estado: 'Paraná', cepMin: 80010000, cepMax: 82999999, ddd: '41' },
  { cidade: 'Londrina', uf: 'PR', estado: 'Paraná', cepMin: 86010000, cepMax: 86099999, ddd: '43' },
  { cidade: 'Florianópolis', uf: 'SC', estado: 'Santa Catarina', cepMin: 88010000, cepMax: 88099999, ddd: '48' },
  { cidade: 'Joinville', uf: 'SC', estado: 'Santa Catarina', cepMin: 89201000, cepMax: 89299999, ddd: '47' },
  { cidade: 'Salvador', uf: 'BA', estado: 'Bahia', cepMin: 40010000, cepMax: 41999999, ddd: '71' },
  { cidade: 'Fortaleza', uf: 'CE', estado: 'Ceará', cepMin: 60010000, cepMax: 60999999, ddd: '85' },
  { cidade: 'Recife', uf: 'PE', estado: 'Pernambuco', cepMin: 50010000, cepMax: 52999999, ddd: '81' },
  { cidade: 'Belém', uf: 'PA', estado: 'Pará', cepMin: 66010000, cepMax: 66999999, ddd: '91' },
  { cidade: 'Manaus', uf: 'AM', estado: 'Amazonas', cepMin: 69010000, cepMax: 69099999, ddd: '92' },
  { cidade: 'Brasília', uf: 'DF', estado: 'Distrito Federal', cepMin: 70002000, cepMax: 72799999, ddd: '61' },
  { cidade: 'Goiânia', uf: 'GO', estado: 'Goiás', cepMin: 74010000, cepMax: 74999999, ddd: '62' },
  { cidade: 'Cuiabá', uf: 'MT', estado: 'Mato Grosso', cepMin: 78010000, cepMax: 78099999, ddd: '65' },
  { cidade: 'Campo Grande', uf: 'MS', estado: 'Mato Grosso do Sul', cepMin: 79010000, cepMax: 79199999, ddd: '67' },
  { cidade: 'Vitória', uf: 'ES', estado: 'Espírito Santo', cepMin: 29010000, cepMax: 29099999, ddd: '27' },
  { cidade: 'Natal', uf: 'RN', estado: 'Rio Grande do Norte', cepMin: 59010000, cepMax: 59099999, ddd: '84' },
  { cidade: 'João Pessoa', uf: 'PB', estado: 'Paraíba', cepMin: 58010000, cepMax: 58099999, ddd: '83' },
  { cidade: 'São Luís', uf: 'MA', estado: 'Maranhão', cepMin: 65010000, cepMax: 65099999, ddd: '98' },
]

const STREET_TYPES = ['Rua', 'Avenida', 'Travessa', 'Alameda', 'Praça', 'Boulevard']

const STREET_NAMES = [
  'das Flores', 'dos Pinheiros', 'do Comércio', 'das Acácias', 'das Palmeiras',
  'dos Bandeirantes', 'da Paz', 'da Liberdade', 'do Sol', 'das Laranjeiras',
  'dos Ipês', 'das Pedras', 'do Lago', 'Presidente Vargas', 'São João',
  'Rio Branco', 'Santos Dumont', 'Getúlio Vargas', 'Sete de Setembro',
  'Marechal Deodoro', 'Tiradentes', 'Independência', 'XV de Novembro',
  'Duque de Caxias', 'João Pessoa', 'General Osório', 'das Nações',
]

const NEIGHBORHOODS = [
  'Centro', 'Jardim América', 'Vila Nova', 'Boa Vista', 'Santa Cruz',
  'São José', 'Bela Vista', 'Jardim das Flores', 'Alto da Serra',
  'Parque Industrial', 'Distrito Industrial', 'Moema', 'Pinheiros',
  'Consolação', 'Liberdade', 'Higienópolis', 'Copacabana', 'Lapa',
  'Savassi', 'Funcionários', 'Moinhos de Vento', 'Auxiliadora', 'Batel',
  'Asa Norte', 'Asa Sul', 'Setor Bueno', 'Jardim Goiás',
]

function formatCep(n: number): string {
  const s = String(n).padStart(8, '0')
  return `${s.slice(0, 5)}-${s.slice(5)}`
}

function formatPhone(ddd: string, commercial = false): string {
  if (commercial) {
    const n1 = String(randInt(3000, 3999))
    const n2 = String(randInt(1000, 9999))
    return `(${ddd}) ${n1}-${n2}`
  }
  const n1 = String(randInt(91000, 99999))
  const n2 = String(randInt(1000, 9999))
  return `(${ddd}) ${n1}-${n2}`
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function buildCompanyName(segment: Segment): { razaoSocial: string; nomeFantasia: string } {
  const style = randInt(1, 4)
  let fantasy: string

  if (style === 1) {
    fantasy = `${rand(PREFIXES)} ${rand(segment.sufixos)}`
  } else if (style === 2) {
    fantasy = `${rand(MIDNAMES)} ${rand(segment.sufixos)}`
  } else if (style === 3) {
    fantasy = `${rand(PREFIXES)} & ${rand(MIDNAMES)}`
  } else {
    fantasy = `${rand(MIDNAMES)} e ${rand(MIDNAMES)} ${rand(segment.sufixos)}`
  }

  const nature = rand(NATURE_OPTIONS)
  let suffix = ''
  if (nature.codigo === '206-2') suffix = ' LTDA'
  else if (nature.codigo === '213-5') suffix = ' S.A.'
  else if (nature.codigo === '231-3') suffix = ' EIRELI'

  return {
    razaoSocial: fantasy.toUpperCase() + suffix,
    nomeFantasia: fantasy,
  }
}

export interface CompanyData {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  inscricaoEstadual: string
  naturezaJuridica: { codigo: string; descricao: string }
  porte: { sigla: string; descricao: string }
  situacaoCadastral: string
  dataAbertura: string
  capitalSocial: string
  setor: string
  atividadePrincipal: string
  cnaePrimario: string
  email: string
  telefone: string
  site: string
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    estado: string
    uf: string
  }
}

export function generateCompany(): CompanyData {
  const segment = rand(SEGMENTS)
  const { razaoSocial, nomeFantasia } = buildCompanyName(segment)
  const cnpj = generateCNPJ()
  const city = rand(CITIES)
  const ie = generateIE(city.uf)

  const nature = rand(NATURE_OPTIONS)
  const porte = rand(PORTE_OPTIONS)

  // Opening date: 1 to 30 years ago
  const currentYear = new Date().getFullYear()
  const openYear = currentYear - randInt(1, 30)
  const openMonth = String(randInt(1, 12)).padStart(2, '0')
  const openDay = String(randInt(1, 28)).padStart(2, '0')
  const dataAbertura = `${openDay}/${openMonth}/${openYear}`

  // Capital social based on porte
  const capitalMap: Record<string, string> = {
    MEI: `R$ ${randInt(1, 80).toLocaleString('pt-BR')}.000,00`,
    ME:  `R$ ${randInt(81, 360).toLocaleString('pt-BR')}.000,00`,
    EPP: `R$ ${(randInt(361, 4800)).toLocaleString('pt-BR')}.000,00`,
    MP:  `R$ ${(randInt(1, 30) * 1000).toLocaleString('pt-BR')}.000,00`,
    GE:  `R$ ${(randInt(30, 500) * 1000).toLocaleString('pt-BR')}.000,00`,
  }
  const capitalSocial = capitalMap[porte.sigla]

  const slug = slugify(nomeFantasia)
  const emailDomain = Math.random() < 0.5
    ? `${slug}.com.br`
    : rand(EMAIL_DOMAINS_CORP)
  const email = `contato@${emailDomain}`
  const site = Math.random() < 0.7 ? `www.${slug}.com.br` : ''

  const telefone = formatPhone(city.ddd, true)

  const cepN = randInt(city.cepMin, city.cepMax)
  const cep = formatCep(cepN)
  const logradouro = `${rand(STREET_TYPES)} ${rand(STREET_NAMES)}`
  const numero = String(randInt(1, 9999))
  const complemento = rand(['', '', '', 'Sala 10', 'Sala 201', 'Andar 3', 'Galpão A', 'Bloco B'])
  const bairro = rand(NEIGHBORHOODS)

  return {
    razaoSocial,
    nomeFantasia,
    cnpj,
    inscricaoEstadual: ie,
    naturezaJuridica: nature,
    porte,
    situacaoCadastral: 'Ativa',
    dataAbertura,
    capitalSocial,
    setor: segment.setor,
    atividadePrincipal: rand(segment.atividades),
    cnaePrimario: segment.cnaePrimario,
    email,
    telefone,
    site,
    endereco: {
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade: city.cidade,
      estado: city.estado,
      uf: city.uf,
    },
  }
}

export function companyToJson(c: CompanyData): object {
  return {
    razao_social: c.razaoSocial,
    nome_fantasia: c.nomeFantasia,
    cnpj: c.cnpj,
    inscricao_estadual: c.inscricaoEstadual,
    natureza_juridica: `${c.naturezaJuridica.codigo} - ${c.naturezaJuridica.descricao}`,
    porte: `${c.porte.sigla} - ${c.porte.descricao}`,
    situacao_cadastral: c.situacaoCadastral,
    data_abertura: c.dataAbertura,
    capital_social: c.capitalSocial,
    setor: c.setor,
    atividade_principal: c.atividadePrincipal,
    cnae_primario: c.cnaePrimario,
    email: c.email,
    telefone: c.telefone,
    ...(c.site ? { site: c.site } : {}),
    endereco: {
      cep: c.endereco.cep,
      logradouro: c.endereco.logradouro,
      numero: c.endereco.numero,
      ...(c.endereco.complemento ? { complemento: c.endereco.complemento } : {}),
      bairro: c.endereco.bairro,
      cidade: c.endereco.cidade,
      estado: c.endereco.estado,
      uf: c.endereco.uf,
    },
  }
}
