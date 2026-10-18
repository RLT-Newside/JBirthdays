// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { type Backup, isBackup } from './backup'
import { decodePacket, parsePacket, readShareHash, type SharePacket } from './share'

export type ImportSource = { kind: 'packet'; packet: SharePacket } | { kind: 'backup'; backup: Backup }

/** Sort a parsed JSON object (file or Android intent) into a share packet or a full backup. */
export function classifyImport(raw: unknown): ImportSource | null {
  if (isBackup(raw)) return { kind: 'backup', backup: raw }
  const packet = parsePacket(raw)
  return packet ? { kind: 'packet', packet } : null
}

/** Accept whatever a user pastes: a full share link, just its `#import=…` hash, or raw JSON. */
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
