// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { parseDateToken } from './dates'
import { splitProperty, unescapeValue, unfoldLines } from './text'
import type { ExternalResult } from './types'

const DECORATION = /^[\s🎂🎉🎈🥳🎁]+|[\s🎂🎉🎈🥳🎁]+$/gu

// Each pattern captures the person's name from a typical birthday event title.
const SUMMARY_PATTERNS = [
  /^(.+?)['’]s? birthday$/i,
  /^(.+?) birthday$/i,
  /^birthday:?\s+(.+)$/i,
  /^happy birthday,?\s+(.+?)!*$/i,
  /^geburtstag(?: von)?:?\s+(.+)$/i,
  /^(.+?)['’]s?\s+geburtstag$/i,
  /^(.+?) geburtstag$/i,
]

/** "Lena's birthday" → "Lena"; null when the title doesn't look like a birthday. */
export function birthdayNameFromSummary(summary: string): string | null {
  const s = summary.replace(DECORATION, '')
  for (const re of SUMMARY_PATTERNS) {
    const m = s.match(re)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return null
}

/**
 * Read birthdays from an iCalendar file. An event counts when it repeats yearly
 * or its title looks like a birthday; everything else (meetings…) is ignored.
 */
export function parseIcs(text: string): ExternalResult {
  const result: ExternalResult = { entries: [], skipped: [] }
  let ev: Record<string, string> | null = null
  let birthdaysCalendar = false

  for (const line of unfoldLines(text)) {
    const prop = splitProperty(line)
    if (!prop) continue
    const value = prop.value.trim()
    if (prop.name === 'X-WR-CALNAME' && !ev) birthdaysCalendar = BIRTHDAY_CALENDAR.test(value)
    else if (prop.name === 'BEGIN' && value.toUpperCase() === 'VEVENT') ev = {}
    else if (prop.name === 'END' && value.toUpperCase() === 'VEVENT' && ev) {
      addEvent(ev, birthdaysCalendar, result)
      ev = null
    } else if (ev && !(prop.name in ev)) ev[prop.name] = prop.value
  }
  return result
}

// Calendar names of dedicated birthday calendars (Google "Birthdays", Apple "Geburtstage", …).
const BIRTHDAY_CALENDAR = /birthday|geburtstag|anniversaire|cumplea|compleann|verjaardag/i

/**
 * A birthday-titled event always counts; a plain yearly event only inside a birthdays
 * calendar (otherwise "Christmas" or "Car insurance" would become people). The start
 * year is only a birth year in a birthdays calendar — elsewhere it's when the event was created.
 */
function addEvent(ev: Record<string, string>, birthdaysCalendar: boolean, result: ExternalResult) {
  const summary = unescapeValue(ev.SUMMARY ?? '').trim()
  const yearly = /FREQ=YEARLY/i.test(ev.RRULE ?? '')
  const fromTitle = birthdayNameFromSummary(summary)
  if (!fromTitle && !(yearly && birthdaysCalendar)) return
  const name = fromTitle ?? summary
  if (!name) return
  const date = ev.DTSTART ? parseDateToken(ev.DTSTART) : null
  if (!date || date === 'ambiguous') {
    result.skipped.push({ label: name, reason: 'Unreadable date' })
    return
  }
  const { year, ...monthDay } = date
  result.entries.push(birthdaysCalendar && year !== undefined ? { name, ...monthDay, year } : { name, ...monthDay })
}
