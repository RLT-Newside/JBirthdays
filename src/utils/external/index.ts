// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { personKey } from '../importMerge'
import type { SharePacket } from '../share'
import { parseCsv } from './csv'
import { parseIcs } from './ics'
import type { ExternalEntry, ExternalResult } from './types'
import { parseVcf } from './vcf'

export type ExternalFormat = 'calendar' | 'contacts' | 'spreadsheet'

/** Guess which kind of export a text file is; null for anything else (JSON, links, prose). */
export function detectExternal(text: string): ExternalFormat | null {
  const t = text.replace(/^﻿/, '').trimStart()
  if (/^BEGIN:VCALENDAR/i.test(t)) return 'calendar'
  if (/^BEGIN:VCARD/i.test(t)) return 'contacts'
  if (t.startsWith('{')) return null
  const firstLine = t.split(/\r?\n/, 1)[0] ?? ''
  return /[,;]/.test(firstLine) ? 'spreadsheet' : null
}

export function parseExternal(text: string, format: ExternalFormat): ExternalResult {
  if (format === 'calendar') return parseIcs(text)
  if (format === 'contacts') return parseVcf(text)
  return parseCsv(text)
}

/** Wrap imported entries as a share packet so they go through the normal import preview and merge. */
export function toPacket(entries: ExternalEntry[]): SharePacket {
  const seen = new Set<string>()
  const people: SharePacket['people'] = []
  entries.forEach((e, i) => {
    const key = personKey(e)
    if (seen.has(key)) return
    seen.add(key)
    people.push({
      id: `ext-${i}`,
      name: e.name.trim(),
      month: e.month,
      day: e.day,
      ...(e.year !== undefined && { year: e.year }),
      tags: [],
    })
  })
  return { app: 'jbirthdays', version: 1, people }
}
