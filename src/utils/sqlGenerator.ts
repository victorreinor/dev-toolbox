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
  let s = String(val).replace(/'/g, "''")
  // MySQL processes backslash escapes inside string literals by default, so a
  // trailing/embedded backslash would otherwise escape the closing quote.
  if (dialect === 'mysql') s = s.replace(/\\/g, '\\\\')
  return dialect === 'mssql' ? `N'${s}'` : `'${s}'`
}

// Identifiers can carry the delimiter char (spreadsheet headers are arbitrary
// text); double it so the value can't break out of the quoting.
function quoteIdent(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return `\`${name.replace(/`/g, '``')}\``
  if (dialect === 'mssql') return `[${name.replace(/]/g, ']]')}]`
  return `"${name.replace(/"/g, '""')}"`
}

export function operationNeedsKey(op: SqlOperation): boolean {
  return op !== 'INSERT'
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
  const cols = Object.keys(rows[0])
  const setCols = cols.filter(c => !keyFields.includes(c))
  return rows.map(row => {
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

// ---- DDL ----------------------------------------------------------------

export type ColumnType = 'auto' | 'text' | 'number' | 'boolean' | 'date'

type InferredType = Exclude<ColumnType, 'auto'> | 'integer'

const DDL_TYPES: Record<SqlDialect, Record<InferredType, string>> = {
  mysql: { integer: 'BIGINT', number: 'DOUBLE', boolean: 'TINYINT(1)', date: 'DATETIME', text: 'TEXT' },
  postgres: { integer: 'BIGINT', number: 'DOUBLE PRECISION', boolean: 'BOOLEAN', date: 'TIMESTAMP', text: 'TEXT' },
  sqlite: { integer: 'INTEGER', number: 'REAL', boolean: 'INTEGER', date: 'TEXT', text: 'TEXT' },
  mssql: { integer: 'BIGINT', number: 'FLOAT', boolean: 'BIT', date: 'DATETIME2', text: 'NVARCHAR(MAX)' },
}

// Rows scanned to guess a column's type. Beyond this the extra confidence isn't
// worth the scan on a file-scale sheet.
const INFER_SAMPLE_ROWS = 1000

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/

function inferColumnType(rows: Record<string, unknown>[], col: string): InferredType {
  let sawValue = false
  let allInteger = true
  let allNumber = true
  let allBoolean = true
  let allDate = true

  const limit = Math.min(rows.length, INFER_SAMPLE_ROWS)
  for (let i = 0; i < limit; i++) {
    const val = rows[i][col]
    if (val === null || val === undefined || val === '') continue
    sawValue = true

    if (typeof val === 'boolean') { allNumber = allInteger = allDate = false; continue }
    allBoolean = false

    if (typeof val === 'number') {
      allDate = false
      if (!Number.isInteger(val)) allInteger = false
      continue
    }

    allNumber = allInteger = false
    if (!DATE_LIKE.test(String(val))) allDate = false
    if (!allDate) return 'text'
  }

  if (!sawValue) return 'text'
  if (allBoolean) return 'boolean'
  if (allInteger) return 'integer'
  if (allNumber) return 'number'
  if (allDate) return 'date'
  return 'text'
}

interface CreateTableOptions {
  table: string
  dialect: SqlDialect
  keyFields: string[]
  /** Explicit type per column; columns set to 'auto' (or absent) are inferred from the data. */
  types?: Record<string, ColumnType>
}

export function generateCreateTable(
  rows: Record<string, unknown>[],
  { table, dialect, keyFields, types }: CreateTableOptions
): string {
  if (rows.length === 0) return ''
  const q = (n: string) => quoteIdent(n, dialect)
  const cols = Object.keys(rows[0])

  const defs = cols.map(col => {
    const forced = types?.[col]
    const type: InferredType = !forced || forced === 'auto' ? inferColumnType(rows, col) : forced
    return `  ${q(col)} ${DDL_TYPES[dialect][type]}`
  })

  const validKeys = keyFields.filter(k => cols.includes(k))
  if (validKeys.length > 0) {
    defs.push(`  PRIMARY KEY (${validKeys.map(q).join(', ')})`)
  }

  // MSSQL has no CREATE TABLE IF NOT EXISTS.
  const head = dialect === 'mssql'
    ? `CREATE TABLE ${q(table)} (`
    : `CREATE TABLE IF NOT EXISTS ${q(table)} (`

  return `${head}\n${defs.join(',\n')}\n);`
}

// ---- Transaction --------------------------------------------------------

export function wrapInTransaction(sql: string, dialect: SqlDialect): string {
  const begin = dialect === 'mysql' ? 'START TRANSACTION;'
    : dialect === 'mssql' ? 'BEGIN TRANSACTION;'
    : 'BEGIN;'
  return `${begin}\n\n${sql}\n\nCOMMIT;`
}
