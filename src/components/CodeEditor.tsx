import { useRef } from 'react'

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  minHeight?: number
  label?: string
}

export function CodeEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  minHeight = 180,
  label,
}: CodeEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = ref.current!
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newVal = value.substring(0, start) + '  ' + value.substring(end)
      onChange?.(newVal)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2 }, 0)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span className="label">{label}</span>}
      <div style={wrapStyle}>
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          onKeyDown={!readOnly ? handleKeyDown : undefined}
          placeholder={placeholder}
          readOnly={readOnly}
          spellCheck={false}
          style={{ ...textareaStyle, minHeight, cursor: readOnly ? 'text' : 'auto' }}
        />
      </div>
    </div>
  )
}

const wrapStyle: React.CSSProperties = {
  position: 'relative',
  border: '1px solid var(--border-2)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  transition: 'border-color var(--tr)',
  overflow: 'hidden',
}

const textareaStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px 14px',
  background: 'transparent',
  color: 'var(--text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12.5,
  lineHeight: 1.6,
  border: 'none',
  outline: 'none',
  resize: 'vertical',
  overflowX: 'auto',
}
