export type SqlDialect = 'mysql' | 'postgres' | 'sqlite' | 'mssql'
export type SqlOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT'

interface SqlOptions {
  table: string
  operation: SqlOperation
  dialect: SqlDialect
  keyFields: string[]
  batchSize: number
}

function escapeValue(val: unknown, dialect: SqlDialect): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? '1' : '0'
  if (typeof val === 'number') return String(val)
  const s = String(val).replace(/'/g, "''")
  return dialect === 'mssql' ? `N'${s}'` : `'${s}'`
}

function quoteIdent(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return `\`${name}\``
  if (dialect === 'mssql') return `[${name}]`
  return `"${name}"`
}

function generateInsert(
  rows: Record<string, unknown>[],
  table: string,
  q: (n: string) => string,
  ev: (v: unknown) => string,
  batchSize: number
): string {
  const cols = Object.keys(rows[0])
  const colList = `(${cols.map(q).join(', ')})`
  const lines: string[] = []

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const values = batch.map(r => `(${cols.map(c => ev(r[c])).join(', ')})`)
    lines.push(`INSERT INTO ${q(table)} ${colList}\nVALUES\n  ${values.join(',\n  ')};`)
  }

  return lines.join('\n\n')
}

function generateUpdate(
  rows: Record<string, unknown>[],
  table: string,
  q: (n: string) => string,
  ev: (v: unknown) => string,
  keyFields: string[]
): string {
  return rows.map(row => {
    const cols = Object.keys(row)
    const setCols = cols.filter(c => !keyFields.includes(c))
    const setClause = setCols.map(c => `${q(c)} = ${ev(row[c])}`).join(',\n  ')
    const whereClause = keyFields.map(k => `${q(k)} = ${ev(row[k])}`).join(' AND ')
    return `UPDATE ${q(table)}\nSET\n  ${setClause}\nWHERE ${whereClause};`
  }).join('\n\n')
}

function generateDelete(
  rows: Record<string, unknown>[],
  table: string,
  q: (n: string) => string,
  ev: (v: unknown) => string,
  keyFields: string[]
): string {
  return rows.map(row => {
    const whereClause = keyFields.map(k => `${q(k)} = ${ev(row[k])}`).join(' AND ')
    return `DELETE FROM ${q(table)} WHERE ${whereClause};`
  }).join('\n')
}

function generateUpsert(
  rows: Record<string, unknown>[],
  table: string,
  q: (n: string) => string,
  ev: (v: unknown) => string,
  dialect: SqlDialect,
  keyFields: string[]
): string {
  const cols = Object.keys(rows[0])
  const colList = `(${cols.map(q).join(', ')})`

  return rows.map(row => {
    const valueList = `(${cols.map(c => ev(row[c])).join(', ')})`
    const updateCols = cols.filter(c => !keyFields.includes(c))

    if (dialect === 'postgres' || dialect === 'sqlite') {
      const conflict = keyFields.map(q).join(', ')
      const doUpdate = updateCols.map(c => `${q(c)} = EXCLUDED.${q(c)}`).join(',\n    ')
      return `INSERT INTO ${q(table)} ${colList}\nVALUES ${valueList}\nON CONFLICT (${conflict}) DO UPDATE SET\n    ${doUpdate};`
    }

    if (dialect === 'mysql') {
      const doUpdate = updateCols.map(c => `${q(c)} = VALUES(${q(c)})`).join(',\n  ')
      return `INSERT INTO ${q(table)} ${colList}\nVALUES ${valueList}\nON DUPLICATE KEY UPDATE\n  ${doUpdate};`
    }

    // MSSQL — MERGE
    const using = `(SELECT ${cols.map(c => `${ev(row[c])} AS ${q(c)}`).join(', ')}) AS src`
    const on = keyFields.map(k => `tgt.${q(k)} = src.${q(k)}`).join(' AND ')
    const upd = updateCols.map(c => `tgt.${q(c)} = src.${q(c)}`).join(', ')
    const ins = `${colList} VALUES (${cols.map(c => `src.${q(c)}`).join(', ')})`
    return `MERGE ${q(table)} AS tgt\nUSING ${using}\nON (${on})\nWHEN MATCHED THEN UPDATE SET ${upd}\nWHEN NOT MATCHED THEN INSERT ${ins};`
  }).join('\n\n')
}

export function generateSQL(
  data: Record<string, unknown>[],
  opts: SqlOptions
): string {
  if (data.length === 0) return ''
  const { table, operation, dialect, keyFields, batchSize } = opts
  const q = (n: string) => quoteIdent(n, dialect)
  const ev = (v: unknown) => escapeValue(v, dialect)

  switch (operation) {
    case 'INSERT': return generateInsert(data, table, q, ev, batchSize)
    case 'UPDATE': return generateUpdate(data, table, q, ev, keyFields)
    case 'DELETE': return generateDelete(data, table, q, ev, keyFields)
    case 'UPSERT': return generateUpsert(data, table, q, ev, dialect, keyFields)
  }
}
