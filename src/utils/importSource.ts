// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { type Backup, isBackup } from './backup'
import { detectExternal, type ExternalFormat, parseExternal, toPacket } from './external'
import type { SkippedEntry } from './external/types'
import { decodePacket, parsePacket, readShareHash, type SharePacket } from './share'

/** A packet waiting for the user's confirmation; `origin` is set for other apps' exports. */
export interface PendingImport {
  packet: SharePacket
  origin?: ExternalFormat
  skipped?: SkippedEntry[]
}

export type ImportSource = ({ kind: 'packet' } & PendingImport) | { kind: 'backup'; backup: Backup }

/** Sort a parsed JSON object (file or Android intent) into a share packet or a full backup. */
export function classifyImport(raw: unknown): ImportSource | null {
  if (isBackup(raw)) return { kind: 'backup', backup: raw }
  const packet = parsePacket(raw)
  return packet ? { kind: 'packet', packet } : null
}

/**
 * Accept whatever a user pastes or opens: a full share link, just its `#import=…` hash,
 * raw JSON, or another app's calendar / contacts / spreadsheet export.
 */
export async function parseImportText(text: string): Promise<ImportSource | null> {
  const t = text.trim()
  if (!t) return null
  if (t.startsWith('{')) {
    try {
      return classifyImport(JSON.parse(t))
    } catch {
      return null
    }
  }
  const format = detectExternal(t)
  if (format) {
    const { entries, skipped } = parseExternal(t, format)
    if (entries.length === 0 && skipped.length === 0) return null
    return { kind: 'packet', packet: toPacket(entries), origin: format, skipped }
  }
  const hashAt = t.indexOf('#')
  const encoded = hashAt >= 0 ? readShareHash(t.slice(hashAt)) : t
  if (!encoded) return null
  const packet = await decodePacket(encoded)
  return packet ? { kind: 'packet', packet } : null
}

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
