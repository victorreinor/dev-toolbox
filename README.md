# DevUtils

> Ferramentas de dev, sem servidor, sem frescura.

Um toolkit de desenvolvimento 100% client-side para conversão de dados, geração de documentos de teste e manipulação de arquivos — tudo rodando direto no navegador, sem depender de nenhuma API ou servidor externo.

---

## Por que isso existe?

A maioria dos conversores online tem um problema sério: **travam com arquivos grandes**.

Você tenta converter um JSON de 80MB para CSV, a aba congela por 30 segundos, o browser exibe "página sem resposta" — ou simplesmente não funciona. Isso acontece porque essas ferramentas processam tudo na main thread, bloqueando o rendering enquanto o arquivo é lido.

O DevUtils foi construído para resolver exatamente isso:

- **Web Workers** isolam todo processamento pesado da interface — a UI nunca trava, independente do tamanho do arquivo
- **Leitura em chunks de 2MB** via `FileReader.readAsArrayBuffer` — arquivos grandes são processados em pedaços, com progress bar em tempo real
- **Zero servidor** — nada é enviado para nenhum lugar. Seus dados ficam no seu dispositivo

---

## Ferramentas

### Conversores

| Ferramenta | Descrição |
|---|---|
| **JSON → XLSX** | Converte array JSON para planilha Excel. Suporta objetos aninhados (flatten configurável) |
| **JSON → CSV** | JSON para CSV com escolha de separador (`,` `;` tab) e encoding (UTF-8 / UTF-8 BOM) |
| **CSV → JSON** | Parse de CSV para JSON com auto-detecção de separador e inferência de tipos |
| **XLSX → JSON** | Lê planilhas Excel, suporta múltiplas abas, inferência de tipos |
| **XLSX → CSV** | Converte planilha Excel para CSV com opções de separador e BOM |
| **JSON → SQL** | Gera `INSERT`, `UPDATE`, `UPSERT` ou `DELETE` a partir de um array JSON. Suporta MySQL, PostgreSQL, SQLite e MSSQL |

### Geradores

| Ferramenta | Descrição |
|---|---|
| **Gerador de CPF** | Gera CPFs válidos (dígitos verificadores corretos) para dados de teste. 1 a 1000 por vez |
| **Gerador de CNPJ** | Gera CNPJs válidos para dados de teste. 1 a 1000 por vez |

---

## Como rodar

**Pré-requisitos:** Node.js 18+

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:5173`.

```bash
# Build para produção
npm run build

# Preview do build
npm run preview
```

O build gera arquivos estáticos em `dist/` — pode ser hospedado em GitHub Pages, Vercel, S3 ou qualquer CDN.

---

## Como adicionar uma nova ferramenta

A arquitetura é baseada em um registry central. Adicionar uma ferramenta é criar uma pasta e registrá-la:

```
src/tools/minha-ferramenta/
├── meta.ts       # id, nome, categoria, ícone, keywords
├── index.tsx     # componente React (UI)
└── processor.ts  # lógica pura, sem React (testável, Worker-compatível)
```

**1. Crie o `meta.ts`:**

```ts
import { lazy } from 'react'
import type { ToolMeta } from '../../types'

const meta: ToolMeta = {
  id: 'minha-ferramenta',
  name: 'Minha Ferramenta',
  description: 'O que ela faz em uma linha',
  category: 'converter', // 'converter' | 'generator' | 'formatter' | 'validator'
  icon: 'Wrench',
  keywords: ['palavra', 'chave'],
  component: lazy(() => import('./index')),
}

export default meta
```

**2. Registre no `src/registry.ts`:**

```ts
import minhaFerramenta from './tools/minha-ferramenta/meta'

export const registry: ToolMeta[] = [
  // ...ferramentas existentes
  minhaFerramenta,
]
```

Pronto. A ferramenta aparece automaticamente na sidebar e na busca global (⌘K).

---

## Stack

| | |
|---|---|
| Framework | React 19 + Vite 8 |
| Linguagem | TypeScript |
| Roteamento | React Router v7 |
| Processamento XLSX | SheetJS (`xlsx`) via Web Worker |
| Processamento CSV | PapaParse via Web Worker |
| Ícones | Lucide React |
| Estilo | CSS puro (sem UI lib externa) |

---

## Arquitetura

```
src/
├── tools/               # Cada ferramenta é um módulo isolado
│   └── json-to-csv/
│       ├── meta.ts      # Metadados (id, nome, categoria, keywords)
│       ├── index.tsx    # UI (React)
│       └── processor.ts # Lógica pura (sem React, testável)
├── workers/
│   ├── csvParser.worker.ts    # PapaParse em Web Worker
│   └── xlsxParser.worker.ts  # SheetJS em Web Worker
├── components/          # Componentes compartilhados
├── hooks/               # useWorker, useFileStream, useCopyToClipboard
├── utils/               # parseJsonArray e outros utilitários
├── constants/           # delimiters, etc.
├── registry.ts          # Lista central de ferramentas
└── types.ts             # Tipos compartilhados (ToolMeta, ToolCategory)
```

**Princípio central:** toda lógica pesada roda em Web Worker. O componente React só gerencia estado e UI — nunca bloqueia a thread principal.

---

## Privacidade

Nenhum dado é enviado para nenhum servidor. Não há analytics, não há logs remotos, não há dependência de APIs externas. Tudo roda localmente no navegador.
