interface DataTableProps {
  headers: string[]
  rows: (string | number | boolean | null | undefined)[][]
  maxHeight?: number
}

export function DataTable({ headers, rows, maxHeight = 300 }: DataTableProps) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxHeight, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={tdStyle}>{String(cell ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '6px 10px',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-muted)',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  background: 'var(--surface)',
  position: 'sticky',
  top: 0,
}

const tdStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text)',
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
