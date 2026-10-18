// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { Birthday, Person } from '../types'

export function sameBirthday(a?: Birthday, b?: Birthday): boolean {
  if (!a || !b) return false
  return a.month === b.month && a.day === b.day && a.year === b.year
}

const pick = (b: Birthday): Birthday => ({ month: b.month, day: b.day, ...(b.year !== undefined && { year: b.year }) })

/** What the contact currently says, as read from the phone. */
export interface ContactSnapshot {
  birthday?: Birthday
  /** The contact has a birthday value the app can't parse: never overwrite it. */
  birthdayUnreadable?: boolean
  lastUpdated: number
  writable: boolean
}

/** `pull` updates the person, `push` writes the contact; `nextSynced` is the new agreed base. */
export interface SyncAction {
  pull?: Birthday
  push?: Birthday
  nextSynced: Birthday
}

/**
 * Three-way merge of one linked person's birthday (A) with its contact (C) against
 * the last agreed value (B). Names are never synced. A read-only contact only flows
 * into the app.
 */
export function resolveBirthday(person: Person, contact: ContactSnapshot): SyncAction {
  const a = pick(person)
  const b = person.contact ? pick(person.contact.synced) : a
  const c = contact.birthday ? pick(contact.birthday) : undefined
  const push = (v: Birthday): SyncAction => (contact.writable ? { push: v, nextSynced: v } : { nextSynced: b })

  if (!c && contact.birthdayUnreadable) return { nextSynced: b }
  if (!c) return contact.writable ? { push: a, nextSynced: a } : { nextSynced: a }
  const appChanged = !sameBirthday(a, b)
  const contactChanged = !sameBirthday(c, b)
  if (!appChanged && !contactChanged) return { nextSynced: b }
  if (appChanged && !contactChanged) return push(a)
  if (!appChanged && contactChanged) return { pull: c, nextSynced: c }
  if (sameBirthday(a, c)) return { nextSynced: a }
  const appTime = person.birthdayChangedAt ?? person.updatedAt
  if (contact.writable && appTime >= contact.lastUpdated) return { push: a, nextSynced: a }
  return { pull: c, nextSynced: c }
}
