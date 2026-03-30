import { useState, useRef, useCallback } from 'react'
import { useToast } from '../components/Toast'
import { usePageDrop } from './usePageDrop'
import { parseJsonArray } from '../utils/parseJson'

export function useJsonFileInput() {
  const { toast } = useToast()
  const [mode, setMode] = useState<'text' | 'file'>('text')
  const [file, setFile] = useState<File | null>(null)
  const fileData = useRef<Record<string, unknown>[] | null>(null)

  const handleFile = useCallback(async (f: File) => {
    setMode('file')
    setFile(f)
    fileData.current = null
    const data = parseJsonArray(await f.text())
    if (data) fileData.current = data
    else toast('JSON inválido', 'error')
  }, [toast])

  const clearFile = useCallback(() => {
    setFile(null)
    fileData.current = null
  }, [])

  const { draggingOver } = usePageDrop({ accept: ['.json'], onFile: handleFile })

  return { mode, setMode, file, fileData, handleFile, clearFile, draggingOver }
}
