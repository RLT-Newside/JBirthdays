// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { BDAY_KEY_PREFIX, DEVICE_ONLY_KEYS, SCHEMA_VERSION } from '../data/storage'

export interface Backup {
  app: 'jbirthdays-backup'
  schemaVersion: number
  exportedAt: string
  data: Record<string, unknown>
}

export function createBackup(): Backup {
  const data: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(BDAY_KEY_PREFIX) || DEVICE_ONLY_KEYS.includes(key)) continue
    try {
      data[key] = JSON.parse(localStorage.getItem(key) ?? 'null')
    } catch {
      data[key] = localStorage.getItem(key)
    }
  }
  return { app: 'jbirthdays-backup', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }
}

export function isBackup(raw: unknown): raw is Backup {
  if (typeof raw !== 'object' || raw === null) return false
  const r = raw as Record<string, unknown>
  return r.app === 'jbirthdays-backup' && typeof r.data === 'object' && r.data !== null
}

const ARRAY_KEYS = ['bday_people', 'bday_tags', 'bday_gifts', 'bday_templates']

function readArray(key: string): { id: string }[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Apply a backup to localStorage.
 * - `replace` clears every existing `bday_*` key first, then writes the backup.
 * - `merge` keeps current data and appends list entries with unseen ids; the
 *   current settings and theme win.
 * Non-`bday_` keys in the blob are ignored. Callers reload afterwards so every
 * `useStorage` hook re-reads.
 */
export function applyBackup(backup: Backup, mode: 'merge' | 'replace'): void {
  if (mode === 'replace') {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(BDAY_KEY_PREFIX)) keys.push(key)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  }

  for (const [key, value] of Object.entries(backup.data)) {
    if (!key.startsWith(BDAY_KEY_PREFIX) || DEVICE_ONLY_KEYS.includes(key)) continue
    if (mode === 'merge') {
      if (ARRAY_KEYS.includes(key)) {
        const current = readArray(key)
        const incoming = Array.isArray(value) ? (value as { id: string }[]) : []
        const ids = new Set(current.map((e) => e.id))
        localStorage.setItem(key, JSON.stringify([...current, ...incoming.filter((e) => e && !ids.has(e.id))]))
        continue
      }
      if (localStorage.getItem(key) !== null) continue
    }
    localStorage.setItem(key, JSON.stringify(value))
  }
}
