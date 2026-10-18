// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { Birthday } from '../../types'
import { daysInMonth } from '../birthday'
import { isPlaceholderYear, parseDateToken } from './dates'
import type { ExternalResult } from './types'

const HEADERS = {
  name: ['name', 'full name', 'fullname', 'display name'],
  first: ['first name', 'given name', 'vorname'],
  last: ['last name', 'family name', 'nachname'],
  date: ['birthday', 'birthdate', 'birth date', 'date of birth', 'dob', 'date', 'geburtstag', 'geburtsdatum'],
  day: ['day', 'tag'],
  month: ['month', 'monat'],
  year: ['year', 'jahr'],
}

type Column = keyof typeof HEADERS
type Columns = Partial<Record<Column, number>>

/** RFC 4180-ish split: quoted fields may contain the separator, newlines and "" escapes. */
function parseRows(text: string, sep: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field === '') quoted = true
    else if (c === sep) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

function detectColumns(header: string[]): Columns | null {
  const cols: Columns = {}
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase()
    for (const [col, names] of Object.entries(HEADERS) as [Column, string[]][]) {
      if (cols[col] === undefined && names.includes(key)) cols[col] = i
    }
  })
  const hasName = cols.name !== undefined || cols.first !== undefined || cols.last !== undefined
  const hasDate = cols.date !== undefined || (cols.day !== undefined && cols.month !== undefined)
  return hasName && hasDate ? cols : null
}

/** One slash order per file: a part > 12 anywhere decides it; conflicting or no evidence → undefined. */
function inferSlashOrder(cells: string[]): 'dmy' | 'mdy' | undefined {
  let dmy = false
  let mdy = false
  for (const c of cells) {
    const m = c.trim().match(/^(\d{1,2})\/(\d{1,2})\/\d{4}$/)
    if (!m) continue
    if (+m[1] > 12) dmy = true
    if (+m[2] > 12) mdy = true
  }
  if (dmy === mdy) return undefined
  return dmy ? 'dmy' : 'mdy'
}

function fromParts(day: string, month: string, year: string): Birthday | null {
  const d = Number(day)
  const m = Number(month)
  if (!Number.isInteger(d) || !Number.isInteger(m) || m < 1 || m > 12 || d < 1 || d > daysInMonth(m)) return null
  const y = year.trim() ? Number(year) : undefined
  if (y === undefined || !Number.isInteger(y) || y > 2100 || isPlaceholderYear(y)) return { month: m, day: d }
  return { month: m, day: d, year: y }
}

/** Read birthdays from a spreadsheet export (comma or semicolon separated, header optional). */
export function parseCsv(text: string): ExternalResult {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows = parseRows(clean, sep)
  const result: ExternalResult = { entries: [], skipped: [] }
  if (rows.length === 0) return result

  let cols = detectColumns(rows[0])
  let body = rows.slice(1)
  if (!cols) {
    const probe = rows[0][1] ? parseDateToken(rows[0][1]) : null
    if (!probe) return result
    cols = { name: 0, date: 1 }
    body = rows
  }

  const cell = (r: string[], c?: number) => (c === undefined ? '' : (r[c] ?? '').trim())
  const slashOrder = cols.date === undefined ? undefined : inferSlashOrder(body.map((r) => cell(r, cols.date)))

  for (const r of body) {
    const name = cell(r, cols.name) || [cell(r, cols.first), cell(r, cols.last)].filter(Boolean).join(' ')
    if (!name) continue
    const date =
      cols.date !== undefined
        ? parseDateToken(cell(r, cols.date), slashOrder)
        : fromParts(cell(r, cols.day), cell(r, cols.month), cell(r, cols.year))
    if (date === 'ambiguous') result.skipped.push({ label: name, reason: 'Ambiguous date (day/month?)' })
    else if (!date) result.skipped.push({ label: name, reason: 'Unreadable date' })
    else result.entries.push({ name, ...date })
  }
  return result
}
