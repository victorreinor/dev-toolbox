import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '../components/Toast'
import { matchesAccept } from '../utils/fileAccept'

interface UsePageDropOptions {
  accept: string[]
  onFile: (file: File) => void
  disabled?: boolean
}

export function usePageDrop({ accept, onFile, disabled = false }: UsePageDropOptions) {
  const [draggingOver, setDraggingOver] = useState(false)
  const counter = useRef(0)
  const { toast } = useToast()

  const handleDragEnter = useCallback((e: DragEvent) => {
    if (!e.dataTransfer?.types.includes('Files')) return
    counter.current++
    setDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    counter.current--
    if (counter.current <= 0) {
      counter.current = 0
      setDraggingOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    counter.current = 0
    setDraggingOver(false)
    const file = e.dataTransfer?.files[0]
    if (!file) return
    if (!matchesAccept(file, accept)) {
      toast(`Formato inválido. Somente ${accept.join(', ')} são aceitos.`, 'error')
      return
    }
    onFile(file)
  }, [accept, onFile, toast])

  useEffect(() => {
    if (disabled) return
    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [disabled, handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  return { draggingOver }
}
