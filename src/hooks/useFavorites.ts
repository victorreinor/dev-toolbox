import { useState } from 'react'
import { loadJSON, saveJSON } from './storage'

export const FAVORITES_KEY = 'devutils:favorites'

export function loadFavorites(): Set<string> {
  return new Set(loadJSON<string[]>(FAVORITES_KEY, []))
}

function saveFavorites(ids: Set<string>) {
  saveJSON(FAVORITES_KEY, [...ids])
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)

  const toggle = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveFavorites(next)
      return next
    })
  }

  return { favorites, toggle }
}
