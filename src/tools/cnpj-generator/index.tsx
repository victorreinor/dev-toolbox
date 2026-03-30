import { GeneratorTool } from '../../components/GeneratorTool'
import { generateCNPJs } from './processor'

export default function CnpjGenerator() {
  return (
    <GeneratorTool
      name="Gerador de CNPJ"
      description="Gere CNPJs válidos (dígitos verificadores corretos) para dados de teste"
      formatLabel="Formatado (00.000.000/0001-00)"
      generate={generateCNPJs}
      filename="cnpjs"
    />
  )
}
