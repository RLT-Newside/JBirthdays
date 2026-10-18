// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { Birthday } from '../../types'
import { daysInMonth } from '../birthday'

/** Years exporters use when the real one is unknown (Apple 1604, Google/Excel 1900, 0000). */
export function isPlaceholderYear(y: number): boolean {
  return y <= 1900 || y === 1604
}

function build(month: number, day: number, year?: number): Birthday | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(month)) return null
  if (year !== undefined) {
    if (!Number.isInteger(year) || year > 2100) return null
    // A year the date can't exist in (Feb 29 in a non-leap year) isn't a real date.
    if (
      month === 2 &&
      day === 29 &&
      !(year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) &&
      !isPlaceholderYear(year)
    )
      return null
    if (isPlaceholderYear(year)) return { month, day }
    return { month, day, year }
  }
  return { month, day }
}

/**
 * Parse a date as exported by calendars, contacts and spreadsheets.
 * Slash dates (A/B/YYYY) are ambiguous unless one part is > 12 or an order is given.
 */
export function parseDateToken(raw: string, slashOrder?: 'dmy' | 'mdy'): Birthday | 'ambiguous' | null {
  const t = raw.trim().replace(/T.*$/, '')
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ?? t.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (iso) return build(+iso[2], +iso[3], +iso[1])
  const noYear = t.match(/^--(\d{2})-?(\d{2})$/)
  if (noYear) return build(+noYear[1], +noYear[2])
  const dotted = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})?$/)
  if (dotted) return build(+dotted[2], +dotted[1], dotted[3] ? +dotted[3] : undefined)
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!slash) return null
  const a = +slash[1]
  const b = +slash[2]
  const order = slashOrder ?? (a > 12 ? 'dmy' : b > 12 ? 'mdy' : null)
  if (!order) return 'ambiguous'
  return order === 'dmy' ? build(b, a, +slash[3]) : build(a, b, +slash[3])
}
