import { GeneratorTool } from '../../components/GeneratorTool'
import { generateCPFs } from './processor'

export default function CpfGenerator() {
  return (
    <GeneratorTool
      name="Gerador de CPF"
      description="Gere CPFs válidos (dígitos verificadores corretos) para dados de teste"
      formatLabel="Formatado (000.000.000-00)"
      generate={generateCPFs}
      filename="cpfs"
    />
  )
}
