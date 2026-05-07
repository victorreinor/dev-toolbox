import { useRef, useState, useMemo, useCallback } from 'react'

const FONT_SIZE = 12.5
const LINE_HEIGHT = 1.6
const LINE_HEIGHT_PX = FONT_SIZE * LINE_HEIGHT
const PADDING_TOP = 12

const highlightTop = (line: number, scrollTop: number) =>
  PADDING_TOP + (line - 1) * LINE_HEIGHT_PX - scrollTop

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  minHeight?: number
  label?: string
  bare?: boolean
}

export function CodeEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  minHeight = 180,
  label,
  bare = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const [currentLine, setCurrentLine] = useState(1)

  const { lineNumbers, lineNumberWidth } = useMemo(() => {
    const lines = value ? value.split('\n') : ['']
    return {
      lineNumbers: lines.map((_, i) => i + 1),
      lineNumberWidth: `${String(lines.length).length * 8 + 24}px`,
    }
  }, [value])

  const updateCurrentLine = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    const line = ta.value.substring(0, ta.selectionStart).split('\n').length
    if (highlightRef.current) {
      highlightRef.current.style.top = `${highlightTop(line, ta.scrollTop)}px`
    }
    setCurrentLine(prev => (prev === line ? prev : line))
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current!
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newVal = value.substring(0, start) + '  ' + value.substring(end)
      onChange?.(newVal)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2 }, 0)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = scrollTop
    if (highlightRef.current) {
      highlightRef.current.style.top = `${highlightTop(currentLine, scrollTop)}px`
    }
  }

  const flexFill = minHeight === 0

  const row = (
    <div style={{ position: 'relative', display: 'flex', flex: flexFill ? 1 : undefined, minHeight: flexFill ? 0 : undefined, overflow: 'hidden' }}>
      <div
        ref={highlightRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: PADDING_TOP,
          height: LINE_HEIGHT_PX,
          background: 'var(--surface-2)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        ref={lineNumbersRef}
        style={{
          position: 'relative',
          zIndex: 1,
          overflowY: 'hidden',
          overflowX: 'hidden',
          userSelect: 'none',
          background: 'var(--surface-2)',
          borderRight: '1px solid var(--border)',
          padding: '12px 8px',
          flexShrink: 0,
          width: lineNumberWidth,
          textAlign: 'right',
        }}
      >
        {lineNumbers.map(n => (
          <div
            key={n}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: FONT_SIZE,
              lineHeight: LINE_HEIGHT,
              color: n === currentLine ? 'var(--accent)' : 'var(--text-dim)',
              fontWeight: n === currentLine ? 700 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {n}
          </div>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => { onChange?.(e.target.value); updateCurrentLine() }}
        onSelect={updateCurrentLine}
        onScroll={handleScroll}
        onKeyDown={!readOnly ? handleKeyDown : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          minHeight: flexFill ? undefined : minHeight,
          padding: `${PADDING_TOP}px 14px`,
          background: 'transparent',
          color: 'var(--text)',
          fontFamily: 'var(--font-mono)',
          fontSize: FONT_SIZE,
          lineHeight: LINE_HEIGHT,
          border: 'none',
          outline: 'none',
          resize: flexFill ? 'none' : 'vertical',
          overflowY: 'auto',
          overflowX: 'auto',
          cursor: readOnly ? 'text' : 'auto',
        }}
      />
    </div>
  )

  if (bare) return row

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span className="label">{label}</span>}
      <div style={wrapStyle}>{row}</div>
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
