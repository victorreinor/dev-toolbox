import { useState, useRef, useCallback } from 'react'

interface UseFileStreamOptions {
  chunkSize?: number
  onChunk?: (chunk: ArrayBuffer, offset: number, total: number) => void
  onComplete?: (chunks: ArrayBuffer[]) => void
  onError?: (err: Error) => void
}

export interface FileStreamResult {
  read: (file: File) => void
  cancel: () => void
  progress: number
  speed: string
  isReading: boolean
}

export function useFileStream(opts: UseFileStreamOptions = {}): FileStreamResult {
  const { chunkSize = 2 * 1024 * 1024, onChunk, onComplete, onError } = opts
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState('')
  const [isReading, setIsReading] = useState(false)
  const cancelled = useRef(false)
  const startTime = useRef(0)
  const bytesRead = useRef(0)

  const cancel = useCallback(() => { cancelled.current = true }, [])

  const read = useCallback((file: File) => {
    cancelled.current = false
    setIsReading(true)
    setProgress(0)
    setSpeed('')
    startTime.current = Date.now()
    bytesRead.current = 0

    const chunks: ArrayBuffer[] = []
    let offset = 0

    const readNextChunk = () => {
      if (cancelled.current) {
        setIsReading(false)
        return
      }

      const slice = file.slice(offset, offset + chunkSize)
      const reader = new FileReader()

      reader.onload = (e) => {
        if (cancelled.current) { setIsReading(false); return }
        const chunk = e.target!.result as ArrayBuffer
        chunks.push(chunk)
        offset += chunk.byteLength
        bytesRead.current += chunk.byteLength

        const elapsed = (Date.now() - startTime.current) / 1000
        const bps = bytesRead.current / elapsed
        const mbps = bps / (1024 * 1024)
        setSpeed(mbps > 1 ? `${mbps.toFixed(1)} MB/s` : `${(bps / 1024).toFixed(0)} KB/s`)
        setProgress(Math.round((offset / file.size) * 100))

        onChunk?.(chunk, offset - chunk.byteLength, file.size)

        if (offset < file.size) {
          readNextChunk()
        } else {
          setIsReading(false)
          onComplete?.(chunks)
        }
      }

      reader.onerror = () => {
        setIsReading(false)
        onError?.(new Error('Failed to read file'))
      }

      reader.readAsArrayBuffer(slice)
    }

    readNextChunk()
  }, [chunkSize, onChunk, onComplete, onError])

  return { read, cancel, progress, speed, isReading }
}
