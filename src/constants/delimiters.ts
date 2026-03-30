export const DELIMITERS = [
  { label: 'Vírgula (,)', value: ',' },
  { label: 'Ponto e vírgula (;)', value: ';' },
  { label: 'Tab', value: '\t' },
] as const

export const DELIMITERS_WITH_AUTO = [
  { label: 'Auto-detectar', value: '' },
  ...DELIMITERS,
] as const
