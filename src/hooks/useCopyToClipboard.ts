import { useState, useCallback } from 'react'
import { useToast } from '../components/Toast'

export function useCopyToClipboard(resetDelay = 1500) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), resetDelay)
      },
      () => toast('Falha ao copiar', 'error')
    )
  }, [resetDelay, toast])

  return { copy, copied }
}
