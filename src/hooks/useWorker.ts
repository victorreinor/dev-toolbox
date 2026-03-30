import { useRef, useEffect, useCallback } from 'react'

type WorkerFactory = () => Worker

interface UseWorkerOptions<TOut> {
  onMessage: (data: TOut) => void
  onError?: (err: ErrorEvent) => void
}

export function useWorker<TIn, TOut>(
  factory: WorkerFactory,
  opts: UseWorkerOptions<TOut>
) {
  const workerRef = useRef<Worker | null>(null)
  // Use refs so the worker's event handlers always call the latest callbacks
  // without needing to re-register listeners on every render.
  const onMessageRef = useRef(opts.onMessage)
  const onErrorRef = useRef(opts.onError)
  onMessageRef.current = opts.onMessage
  onErrorRef.current = opts.onError

  useEffect(() => {
    const worker = factory()
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<TOut>) => onMessageRef.current(e.data)
    worker.onerror = (e) => onErrorRef.current?.(e)
    return () => { worker.terminate() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- factory is stable (inline arrow); callbacks are accessed via refs

  const post = useCallback((data: TIn) => {
    workerRef.current?.postMessage(data)
  }, [])

  return { post }
}
