import { useEffect, useLayoutEffect, useRef } from 'react'

export function useSubmitOnCmdEnter(callback: () => void) {
  const callbackRef = useRef(callback)
  useLayoutEffect(() => { callbackRef.current = callback })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        callbackRef.current()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
}
