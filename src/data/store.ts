// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.

/** Thin localStorage facade: every access is guarded so a blocked or full
 *  storage (private mode, quota) degrades to defaults instead of crashing. */

export function storeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function storeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    console.error('localStorage quota exceeded — data not saved')
  }
}

export function storeRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
