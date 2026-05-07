import { useState, useEffect, useCallback, useRef } from 'react'

export interface MarkdownEntry {
  id: number
  title: string
  content: string
  savedAt: number
}

const DB_NAME = 'devutils-markdown-history'
const STORE_NAME = 'entries'

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => { dbPromise = null; reject(req.error) }
    })
  }
  return dbPromise
}

export function extractTitle(content: string): string {
  const firstLine = content.split('\n').find(l => l.trim() !== '') ?? ''
  return firstLine.replace(/^#+\s*/, '').trim() || 'Sem título'
}

export function useMarkdownHistory() {
  const [entries, setEntries] = useState<MarkdownEntry[]>([])
  const [loading, setLoading] = useState(true)
  const initialLoad = useRef(true)

  const refresh = useCallback(async () => {
    if (initialLoad.current) setLoading(true)
    try {
      const db = await getDB()
      const all = await new Promise<MarkdownEntry[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).getAll()
        req.onsuccess = () => resolve(req.result as MarkdownEntry[])
        req.onerror = () => reject(req.error)
      })
      setEntries(all.sort((a, b) => b.savedAt - a.savedAt))
    } finally {
      if (initialLoad.current) {
        setLoading(false)
        initialLoad.current = false
      }
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const save = useCallback(async (content: string) => {
    const db = await getDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).add({
        title: extractTitle(content),
        content,
        savedAt: Date.now(),
      })
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
    await refresh()
  }, [refresh])

  const remove = useCallback(async (id: number) => {
    const db = await getDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
    await refresh()
  }, [refresh])

  return { entries, loading, save, remove }
}
