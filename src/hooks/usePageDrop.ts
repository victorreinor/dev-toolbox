import { useEffect, useState, useCallback, useRef } from 'react'

interface UsePageDropOptions {
  accept: string[]
  onFile: (file: File) => void
  disabled?: boolean
}

function matchesAccept(file: File, accept: string[]): boolean {
  return accept.some(type => {
    if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase())
    return file.type.startsWith(type.replace('*', ''))
  })
}

export function usePageDrop({ accept, onFile, disabled = false }: UsePageDropOptions) {
  const [draggingOver, setDraggingOver] = useState(false)
  const counter = useRef(0)

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
    if (file && matchesAccept(file, accept)) onFile(file)
  }, [accept, onFile])

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
