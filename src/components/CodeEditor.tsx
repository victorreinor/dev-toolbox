import { useRef, useState, useMemo, useCallback, useEffect } from 'react'

const FONT_SIZE = 12.5
const LINE_HEIGHT = 1.6
const LINE_HEIGHT_PX = FONT_SIZE * LINE_HEIGHT
const PADDING_TOP = 12
const MIN_RESIZABLE_HEIGHT = 80
// Safety cap: never render more than this many line-number nodes. Rendering one
// <div> per line for a multi-million-line value freezes/crashes the tab. Large
// outputs should be passed as a preview, but this guards every caller regardless.
const MAX_GUTTER_LINES = 5000

function countLines(s: string): number {
  let n = 1
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++
  return n
}

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
  const [editorHeight, setEditorHeight] = useState(minHeight)
  const dragRef = useRef<{ startY: number; startHeight: number; onMove: (ev: MouseEvent) => void; onUp: () => void } | null>(null)

  const { lineNumbers, lineNumberWidth } = useMemo(() => {
    const total = value ? countLines(value) : 1
    const shown = Math.min(total, MAX_GUTTER_LINES)
    return {
      lineNumbers: Array.from({ length: shown }, (_, i) => i + 1),
      lineNumberWidth: `${String(total).length * 8 + 24}px`,
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

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = ev.clientY - dragRef.current.startY
      const next = Math.max(MIN_RESIZABLE_HEIGHT, dragRef.current.startHeight + delta)
      setEditorHeight(next)
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    dragRef.current = { startY: e.clientY, startHeight: editorHeight, onMove, onUp }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    return () => {
      if (dragRef.current) {
        window.removeEventListener('mousemove', dragRef.current.onMove)
        window.removeEventListener('mouseup', dragRef.current.onUp)
      }
    }
  }, [])

  useEffect(() => {
    setEditorHeight(minHeight)
  }, [minHeight])

  const flexFill = minHeight === 0

  const row = (
    <div style={{ position: 'relative', display: 'flex', flex: flexFill ? 1 : undefined, height: flexFill ? undefined : editorHeight, minHeight: flexFill ? 0 : undefined, overflow: 'hidden' }}>
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
          padding: `${PADDING_TOP}px 14px`,
          background: 'transparent',
          color: 'var(--text)',
          fontFamily: 'var(--font-mono)',
          fontSize: FONT_SIZE,
          lineHeight: LINE_HEIGHT,
          border: 'none',
          outline: 'none',
          resize: 'none',
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
      <div style={wrapStyle}>
        {row}
        {!flexFill && (
          <div
            onMouseDown={handleResizeMouseDown}
            style={resizeHandleStyle}
            title="Arrastar para redimensionar"
          >
            <div style={resizeGripStyle} />
          </div>
        )}
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

const resizeHandleStyle: React.CSSProperties = {
  height: 8,
  cursor: 'ns-resize',
  background: 'var(--surface-2)',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
}

const resizeGripStyle: React.CSSProperties = {
  width: 32,
  height: 2,
  borderRadius: 2,
  background: 'var(--border-2)',
}
