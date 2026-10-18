// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Capacitor } from '@capacitor/core'
import type { Birthday } from '../types'
import { parseDateToken } from './external/dates'
import type { ContactPhone } from './whatsapp'

export interface ContactSummary {
  lookupKey: string
  contactId: string
  name: string
  birthday?: Birthday
  /** Has at least one raw contact JBirthdays may write (Google / device). */
  writable: boolean
}

export interface ContactDetails extends ContactSummary {
  /** The key this entry was requested with; `lookupKey` is the current one (may change after merges). */
  requestedKey: string
  phones: ContactPhone[]
  emails: string[]
  addresses: string[]
  /** CONTACT_LAST_UPDATED_TIMESTAMP (ms). */
  lastUpdated: number
}

export interface ContactSyncApi {
  requestRead(): Promise<boolean>
  requestWrite(): Promise<boolean>
  list(): Promise<ContactSummary[]>
  get(lookupKeys: string[]): Promise<{ found: ContactDetails[]; missing: string[] }>
  setBirthday(lookupKey: string, birthday: Birthday): Promise<void>
}

/** Contacts store birthdays as START_DATE "YYYY-MM-DD", or "--MM-DD" without a year. */
export function parseContactDate(startDate: string): Birthday | null {
  const b = parseDateToken(startDate)
  return b && b !== 'ambiguous' ? b : null
}

export function formatContactDate(b: Birthday): string {
  const mmdd = `${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`
  return b.year !== undefined ? `${b.year}-${mmdd}` : `--${mmdd}`
}

// Shapes as sent by ContactSyncPlugin.java.
type RawSummary = Omit<ContactSummary, 'birthday'> & { birthday?: string | null }
type RawDetails = Omit<ContactDetails, 'birthday'> & { birthday?: string | null }

interface NativePlugin {
  requestRead(): Promise<{ granted: boolean }>
  requestWrite(): Promise<{ granted: boolean }>
  list(): Promise<{ contacts: RawSummary[] }>
  get(o: { lookupKeys: string[] }): Promise<{ found: RawDetails[]; missing: string[] }>
  setBirthday(o: { lookupKey: string; startDate: string }): Promise<void>
}

function withBirthday<T extends { birthday?: string | null }>(raw: T): Omit<T, 'birthday'> & { birthday?: Birthday } {
  const { birthday, ...rest } = raw
  const parsed = birthday ? parseContactDate(birthday) : null
  return parsed ? { ...rest, birthday: parsed } : rest
}

/** The Android contacts bridge, or null on web / older APKs without the plugin. */
export function getContactSync(): ContactSyncApi | null {
  if (!Capacitor.isNativePlatform()) return null
  const plugins = (window as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor?.Plugins
  const native = plugins?.ContactSync as NativePlugin | undefined
  if (!native) return null
  return {
    requestRead: async () => (await native.requestRead()).granted,
    requestWrite: async () => (await native.requestWrite()).granted,
    list: async () => (await native.list()).contacts.map(withBirthday),
    get: async (lookupKeys) => {
      const r = await native.get({ lookupKeys })
      return { found: r.found.map(withBirthday), missing: r.missing }
    },
    setBirthday: (lookupKey, birthday) => native.setBirthday({ lookupKey, startDate: formatContactDate(birthday) }),
  }
}
