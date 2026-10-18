// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../data/storage'
import { storeGet, storeSet } from '../data/store'

export type Theme = 'coral' | 'yellow' | 'cyan' | 'purple' | 'green'

export const THEMES: { id: Theme; color: string }[] = [
  { id: 'coral', color: '#fb7185' },
  { id: 'yellow', color: '#f5e642' },
  { id: 'cyan', color: '#22d3ee' },
  { id: 'purple', color: '#a855f7' },
  { id: 'green', color: '#4ade80' },
]

function readTheme(): Theme {
  const t = storeGet(STORAGE_KEYS.theme) as Theme | null
  return t && THEMES.some((x) => x.id === t) ? t : 'coral'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'coral') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  const setTheme = (t: Theme) => {
    storeSet(STORAGE_KEYS.theme, t)
    setThemeState(t)
  }

  return { theme, setTheme }
}
