function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const NAMES_M = [
  'João', 'Pedro', 'Lucas', 'Gabriel', 'Matheus', 'Rafael', 'Felipe', 'Diego',
  'André', 'Bruno', 'Carlos', 'Daniel', 'Eduardo', 'Fernando', 'Gustavo',
  'Henrique', 'Igor', 'Jorge', 'Leonardo', 'Marcos', 'Paulo', 'Ricardo',
  'Rodrigo', 'Thiago', 'Vinícius', 'Wagner', 'Alexandre', 'Antônio', 'Caio',
  'Davi', 'Enzo', 'Fábio', 'Guilherme', 'Hugo', 'Júlio', 'Kevin', 'Luan',
  'Miguel', 'Nathan', 'Otávio', 'Patrick', 'Roberto', 'Samuel', 'Tiago',
  'Vitor', 'Wesley', 'Yuri', 'Arthur', 'Bernardo', 'Cauã',
]

const NAMES_F = [
  'Ana', 'Maria', 'Julia', 'Fernanda', 'Beatriz', 'Camila', 'Larissa', 'Letícia',
  'Natalia', 'Priscila', 'Renata', 'Sandra', 'Tatiana', 'Vanessa', 'Amanda',
  'Bruna', 'Carla', 'Daniela', 'Elisa', 'Flavia', 'Gabriela', 'Helena',
  'Isabela', 'Joana', 'Karina', 'Luciana', 'Mariana', 'Nadia', 'Patricia',
  'Rafaela', 'Sabrina', 'Thaís', 'Viviane', 'Alice', 'Carolina', 'Diana',
  'Evelyn', 'Gisele', 'Iara', 'Juliana', 'Luana', 'Melissa', 'Nina',
  'Rebeca', 'Sofia', 'Vitória', 'Yasmin', 'Clara', 'Bianca', 'Giovanna',
]

const SURNAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
  'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
  'Almeida', 'Lopes', 'Sousa', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha',
  'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado',
  'Mendes', 'Freitas', 'Cardoso', 'Ramos', 'Gonçalves', 'Santana', 'Teixeira',
  'Araújo', 'Melo', 'Azevedo', 'Campos', 'Cruz', 'Pinto', 'Castro', 'Monteiro',
  'Correia', 'Miranda', 'Cavalcanti', 'Farias', 'Borges', 'Cunha', 'Reis',
]

function generateCPF(): string {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  const calc = (digits: number[], ws: number[]) => {
    const sum = digits.reduce((a, x, i) => a + x * ws[i], 0)
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = calc(d, [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = calc([...d, d1], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  const s = [...d, d1, d2].join('')
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`
}

function generateRG(): string {
  const d = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('')
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${Math.floor(Math.random() * 10)}`
}

// Luhn algorithm: generate N-1 random digits after prefix, then compute check digit
function luhnComplete(prefix: string, totalLength: number): string {
  let number = prefix
  while (number.length < totalLength - 1) {
    number += Math.floor(Math.random() * 10)
  }
  const rev = number.split('').reverse()
  let sum = 0
  for (let i = 0; i < rev.length; i++) {
    let d = parseInt(rev[i])
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return number + ((10 - (sum % 10)) % 10)
}

function generateCard(bandeira: 'Visa' | 'Mastercard') {
  const prefix = bandeira === 'Visa' ? '4' : `5${randInt(1, 5)}`
  const raw = luhnComplete(prefix, 16)
  const numero = `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)} ${raw.slice(12)}`
  const month = String(randInt(1, 12)).padStart(2, '0')
  const year = String(new Date().getFullYear() + randInt(1, 5)).slice(-2)
  return { numero, bandeira, validade: `${month}/${year}`, cvv: String(randInt(100, 999)) }
}

const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'icloud.com']

function generateEmail(first: string, last: string): string {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s/g, '')
  const f = normalize(first)
  const l = normalize(last)
  const n = randInt(1, 99)
  const pattern = rand([`${f}.${l}`, `${f}${l}`, `${f}.${l}${n}`, `${f}${n}`])
  return `${pattern}@${rand(EMAIL_DOMAINS)}`
}

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
  { cidade: 'Juiz de Fora', uf: 'MG', estado: 'Minas Gerais', cepMin: 36010000, cepMax: 36099999, ddd: '32' },
  { cidade: 'Porto Alegre', uf: 'RS', estado: 'Rio Grande do Sul', cepMin: 90010000, cepMax: 91999999, ddd: '51' },
  { cidade: 'Caxias do Sul', uf: 'RS', estado: 'Rio Grande do Sul', cepMin: 95010000, cepMax: 95099999, ddd: '54' },
  { cidade: 'Pelotas', uf: 'RS', estado: 'Rio Grande do Sul', cepMin: 96010000, cepMax: 96099999, ddd: '53' },
  { cidade: 'Curitiba', uf: 'PR', estado: 'Paraná', cepMin: 80010000, cepMax: 82999999, ddd: '41' },
  { cidade: 'Londrina', uf: 'PR', estado: 'Paraná', cepMin: 86010000, cepMax: 86099999, ddd: '43' },
  { cidade: 'Maringá', uf: 'PR', estado: 'Paraná', cepMin: 87010000, cepMax: 87099999, ddd: '44' },
  { cidade: 'Florianópolis', uf: 'SC', estado: 'Santa Catarina', cepMin: 88010000, cepMax: 88099999, ddd: '48' },
  { cidade: 'Joinville', uf: 'SC', estado: 'Santa Catarina', cepMin: 89201000, cepMax: 89299999, ddd: '47' },
  { cidade: 'Blumenau', uf: 'SC', estado: 'Santa Catarina', cepMin: 89010000, cepMax: 89099999, ddd: '47' },
  { cidade: 'Salvador', uf: 'BA', estado: 'Bahia', cepMin: 40010000, cepMax: 41999999, ddd: '71' },
  { cidade: 'Feira de Santana', uf: 'BA', estado: 'Bahia', cepMin: 44001000, cepMax: 44099999, ddd: '75' },
  { cidade: 'Fortaleza', uf: 'CE', estado: 'Ceará', cepMin: 60010000, cepMax: 60999999, ddd: '85' },
  { cidade: 'Recife', uf: 'PE', estado: 'Pernambuco', cepMin: 50010000, cepMax: 52999999, ddd: '81' },
  { cidade: 'Belém', uf: 'PA', estado: 'Pará', cepMin: 66010000, cepMax: 66999999, ddd: '91' },
  { cidade: 'Manaus', uf: 'AM', estado: 'Amazonas', cepMin: 69010000, cepMax: 69099999, ddd: '92' },
  { cidade: 'Brasília', uf: 'DF', estado: 'Distrito Federal', cepMin: 70002000, cepMax: 72799999, ddd: '61' },
  { cidade: 'Goiânia', uf: 'GO', estado: 'Goiás', cepMin: 74010000, cepMax: 74999999, ddd: '62' },
  { cidade: 'Cuiabá', uf: 'MT', estado: 'Mato Grosso', cepMin: 78010000, cepMax: 78099999, ddd: '65' },
  { cidade: 'Campo Grande', uf: 'MS', estado: 'Mato Grosso do Sul', cepMin: 79010000, cepMax: 79199999, ddd: '67' },
  { cidade: 'Vitória', uf: 'ES', estado: 'Espírito Santo', cepMin: 29010000, cepMax: 29099999, ddd: '27' },
  { cidade: 'Maceió', uf: 'AL', estado: 'Alagoas', cepMin: 57010000, cepMax: 57099999, ddd: '82' },
  { cidade: 'Natal', uf: 'RN', estado: 'Rio Grande do Norte', cepMin: 59010000, cepMax: 59099999, ddd: '84' },
  { cidade: 'João Pessoa', uf: 'PB', estado: 'Paraíba', cepMin: 58010000, cepMax: 58099999, ddd: '83' },
  { cidade: 'São Luís', uf: 'MA', estado: 'Maranhão', cepMin: 65010000, cepMax: 65099999, ddd: '98' },
  { cidade: 'Teresina', uf: 'PI', estado: 'Piauí', cepMin: 64010000, cepMax: 64099999, ddd: '86' },
]

const STREET_TYPES = ['Rua', 'Avenida', 'Travessa', 'Alameda', 'Praça', 'Boulevard']

const STREET_NAMES = [
  'das Flores', 'dos Pinheiros', 'do Comércio', 'das Acácias', 'das Palmeiras',
  'dos Bandeirantes', 'da Saudade', 'da Paz', 'da Liberdade', 'do Sol',
  'das Laranjeiras', 'dos Ipês', 'das Orquídeas', 'das Margaridas',
  'das Pedras', 'do Lago', 'da Serra', 'dos Sabiás', 'das Rosas',
  'Presidente Vargas', 'São João', 'Santa Cecília', 'Rio Branco', 'Santos Dumont',
  'Getúlio Vargas', 'Sete de Setembro', 'Dom Pedro I', 'Voluntários da Pátria',
  'Marechal Deodoro', 'Tiradentes', 'Independência', 'Brasil', 'das Nações',
  'XV de Novembro', 'João Pessoa', 'Duque de Caxias', 'General Osório',
]

const NEIGHBORHOODS = [
  'Centro', 'Jardim América', 'Vila Nova', 'Boa Vista', 'Santa Cruz',
  'São José', 'Bela Vista', 'Vila Esperança', 'Jardim das Flores', 'Alto da Serra',
  'Vila dos Trabalhadores', 'Jardim Paulista', 'Moema', 'Pinheiros', 'Ipiranga',
  'Consolação', 'Liberdade', 'Santa Cecília', 'Perdizes', 'Higienópolis',
  'Copacabana', 'Ipanema', 'Leblon', 'Lapa', 'Savassi', 'Funcionários',
  'Mangabeiras', 'Moinhos de Vento', 'Auxiliadora', 'Batel', 'Água Verde',
  'Cristo Rei', 'Pituba', 'Barra', 'Graça', 'Meireles', 'Aldeota',
  'Asa Norte', 'Asa Sul', 'Setor Bueno', 'Setor Sul', 'Jardim Goiás',
]

function formatCep(n: number): string {
  const s = String(n).padStart(8, '0')
  return `${s.slice(0, 5)}-${s.slice(5)}`
}

export interface PersonData {
  nome: string
  sobrenome: string
  nomeCompleto: string
  sexo: 'M' | 'F'
  cpf: string
  rg: string
  email: string
  telefone: string
  nascimento: string
  idade: number
  cartao: {
    numero: string
    bandeira: 'Visa' | 'Mastercard'
    validade: string
    cvv: string
    titular: string
  }
  endereco: {
    cep: string
    logradouro: string
    numero: string
    bairro: string
    cidade: string
    estado: string
    uf: string
  }
}

export function generatePerson(): PersonData {
  const sexo: 'M' | 'F' = Math.random() < 0.5 ? 'M' : 'F'
  const nome = sexo === 'M' ? rand(NAMES_M) : rand(NAMES_F)
  const s1 = rand(SURNAMES)
  const s2 = rand(SURNAMES.filter(s => s !== s1))
  const sobrenome = `${s1} ${s2}`
  const nomeCompleto = `${nome} ${sobrenome}`

  const cpf = generateCPF()
  const rg = generateRG()

  const city = rand(CITIES)
  const ddd = city.ddd

  const phoneBody = `${randInt(91000, 99999)}-${String(randInt(1000, 9999))}`
  const telefone = `(${ddd}) ${phoneBody}`

  const email = generateEmail(nome, s1)

  const currentYear = new Date().getFullYear()
  const birthYear = currentYear - randInt(18, 75)
  const birthMonth = String(randInt(1, 12)).padStart(2, '0')
  const birthDay = String(randInt(1, 28)).padStart(2, '0')
  const nascimento = `${birthDay}/${birthMonth}/${birthYear}`
  const idade = currentYear - birthYear

  const bandeira: 'Visa' | 'Mastercard' = Math.random() < 0.5 ? 'Visa' : 'Mastercard'
  const card = generateCard(bandeira)
  const cartao = { ...card, titular: nomeCompleto.toUpperCase().slice(0, 26) }

  const cepN = randInt(city.cepMin, city.cepMax)
  const cep = formatCep(cepN)
  const logradouro = `${rand(STREET_TYPES)} ${rand(STREET_NAMES)}`
  const numero = String(randInt(1, 9999))
  const bairro = rand(NEIGHBORHOODS)

  return {
    nome,
    sobrenome,
    nomeCompleto,
    sexo,
    cpf,
    rg,
    email,
    telefone,
    nascimento,
    idade,
    cartao,
    endereco: { cep, logradouro, numero, bairro, cidade: city.cidade, estado: city.estado, uf: city.uf },
  }
}

export function personToJson(p: PersonData): object {
  return {
    nome: p.nome,
    sobrenome: p.sobrenome,
    nome_completo: p.nomeCompleto,
    sexo: p.sexo === 'M' ? 'Masculino' : 'Feminino',
    cpf: p.cpf,
    rg: p.rg,
    email: p.email,
    telefone: p.telefone,
    data_nascimento: p.nascimento,
    idade: p.idade,
    cartao_credito: {
      numero: p.cartao.numero,
      bandeira: p.cartao.bandeira,
      validade: p.cartao.validade,
      cvv: p.cartao.cvv,
      titular: p.cartao.titular,
    },
    endereco: {
      cep: p.endereco.cep,
      logradouro: p.endereco.logradouro,
      numero: p.endereco.numero,
      bairro: p.endereco.bairro,
      cidade: p.endereco.cidade,
      estado: p.endereco.estado,
      uf: p.endereco.uf,
    },
  }
}
