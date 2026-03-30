import { createContext, useContext, useReducer, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

type Action =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string }

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case 'ADD': return [...state, action.toast]
    case 'REMOVE': return state.filter(t => t.id !== action.id)
    default: return state
  }
}

const ToastContext = createContext<{
  toast: (message: string, type?: ToastType) => void
}>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    dispatch({ type: 'ADD', toast: { id, type, message } })
    timers.current[id] = setTimeout(() => {
      dispatch({ type: 'REMOVE', id })
      delete timers.current[id]
    }, 3000)
  }, [])

  useEffect(() => {
    const t = timers.current
    return () => { Object.values(t).forEach(clearTimeout) }
  }, [])

  const remove = (id: string) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    dispatch({ type: 'REMOVE', id })
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={containerStyle}>
        {toasts.map(t => (
          <div key={t.id} style={toastStyle(t.type)}>
            {iconFor(t.type)}
            <span style={{ flex: 1, fontSize: 13 }}>{t.message}</span>
            <button onClick={() => remove(t.id)} style={closeStyle}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

function iconFor(type: ToastType) {
  const size = 14
  switch (type) {
    case 'success': return <CheckCircle size={size} color="var(--accent)" />
    case 'error':   return <AlertCircle size={size} color="var(--error)" />
    case 'warning': return <AlertTriangle size={size} color="var(--warning)" />
    default:        return <AlertCircle size={size} color="var(--text-muted)" />
  }
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 20,
  right: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  zIndex: 1000,
  pointerEvents: 'none',
}

function toastStyle(type: ToastType): React.CSSProperties {
  const borderColor =
    type === 'success' ? 'var(--accent-border)' :
    type === 'error'   ? 'rgba(255,69,69,0.3)' :
    type === 'warning' ? 'rgba(245,166,35,0.3)' :
    'var(--border-2)'

  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: 'var(--surface-2)',
    border: `1px solid ${borderColor}`,
    borderRadius: 'var(--radius)',
    minWidth: 260,
    maxWidth: 380,
    animation: 'toastIn 200ms ease both',
    pointerEvents: 'all',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  }
}

const closeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-muted)',
  padding: 2,
  transition: 'color var(--tr)',
  flexShrink: 0,
}
