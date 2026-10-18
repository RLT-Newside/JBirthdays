// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { Person, PersonDraft } from '../types'
import { daysInMonth } from './birthday'
import { personKey } from './importMerge'

/** One line in the Quick add sheet; year stays a string while typing. */
export interface QuickRow {
  key: string
  name: string
  day: number
  month: number
  year: string
}

export type RowStatus = 'empty' | 'invalid' | 'duplicate' | 'ok'

export function rowStatus(row: QuickRow, people: Person[]): RowStatus {
  if (!row.name.trim()) return 'empty'
  const year = row.year.trim()
  if (year && !(/^\d{4}$/.test(year) && +year >= 1900 && +year <= 2100)) return 'invalid'
  if (row.day > daysInMonth(row.month)) return 'invalid'
  const key = personKey({ name: row.name, month: row.month, day: row.day })
  return people.some((p) => personKey(p) === key) ? 'duplicate' : 'ok'
}

/** Valid, not-yet-saved rows as person drafts, each person once. */
export function rowsToDrafts(rows: QuickRow[], people: Person[], tagIds: string[]): PersonDraft[] {
  const seen = new Set<string>()
  const drafts: PersonDraft[] = []
  for (const row of rows) {
    if (rowStatus(row, people) !== 'ok') continue
    const key = personKey({ name: row.name, month: row.month, day: row.day })
    if (seen.has(key)) continue
    seen.add(key)
    const year = row.year.trim()
    drafts.push({
      name: row.name.trim(),
      month: row.month,
      day: row.day,
      ...(year && { year: Number(year) }),
      tagIds: [...tagIds],
    })
  }
  return drafts
}
