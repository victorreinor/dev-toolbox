import { useState, useEffect } from 'react'
import { registry } from '../registry'
import { loadJSON, saveJSON } from './storage'

const ALL_ORDER_KEY = 'devutils:order:all'
const PINNED_ORDER_KEY = 'devutils:order:pinned'

/** Keep saved order for valid IDs; append IDs not yet in saved at the end */
function reconcile(saved: string[], current: string[]): string[] {
  const currentSet = new Set(current)
  const kept = saved.filter(id => currentSet.has(id))
  const keptSet = new Set(kept)
  return [...kept, ...current.filter(id => !keptSet.has(id))]
}

function moveItem(arr: string[], from: number, to: number): string[] {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const allIds = registry.map(t => t.id)

export function useCardOrder(pinnedIds: string[]) {
  const [allOrder, setAllOrder] = useState<string[]>(() =>
    reconcile(loadJSON<string[]>(ALL_ORDER_KEY, []), allIds)
  )
  const [pinnedOrder, setPinnedOrder] = useState<string[]>(() =>
    reconcile(loadJSON<string[]>(PINNED_ORDER_KEY, []), pinnedIds)
  )

  // pinnedIds.join is a stable string dep; fires only when the set of favorites changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPinnedOrder(prev => {
      const next = reconcile(prev, pinnedIds)
      saveJSON(PINNED_ORDER_KEY, next)
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedIds.join(',')])

  function reorderAll(from: number, to: number) {
    setAllOrder(prev => {
      const next = moveItem(prev, from, to)
      saveJSON(ALL_ORDER_KEY, next)
      return next
    })
  }

  function reorderPinned(from: number, to: number) {
    setPinnedOrder(prev => {
      const next = moveItem(prev, from, to)
      saveJSON(PINNED_ORDER_KEY, next)
      return next
    })
  }

  return { allOrder, pinnedOrder, reorderAll, reorderPinned }
}
