// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { Person } from '../types'
import type { ContactSummary } from './contacts'

/** Comparable form of a name: lowercase, no accents, ß→ss, single spaces. */
export function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim()
}

const firstToken = (s: string) => normalizeName(s).split(' ')[0] ?? ''

/**
 * The unlinked person this contact most likely is: same name, or same day/month
 * and same first name ("Max" ↔ "Max Muster"). Used to link instead of duplicating.
 */
export function findPersonMatch(contact: ContactSummary, people: Person[]): Person | undefined {
  const free = people.filter((p) => !p.contact)
  const name = normalizeName(contact.name)
  const byName = free.find((p) => normalizeName(p.name) === name)
  if (byName) return byName
  const b = contact.birthday
  if (!b) return undefined
  const first = firstToken(contact.name)
  return free.find((p) => p.month === b.month && p.day === b.day && firstToken(p.name) === first)
}
