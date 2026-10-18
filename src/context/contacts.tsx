// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { App } from '@capacitor/app'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { STORAGE_KEYS } from '../data/storage'
import { useStorage } from '../hooks/useStorage'
import type { Birthday, ContactLink, Person, PersonDraft } from '../types'
import { resolveBirthday } from '../utils/contactSync'
import { type ContactSummary, type ContactSyncApi, getContactSync } from '../utils/contacts'
import type { ContactPhone } from '../utils/whatsapp'
import { useAppData } from './app-data'

export interface CachedContact {
  phones: ContactPhone[]
  emails: string[]
  addresses: string[]
  /** Number the user picked for WhatsApp when the contact has several. */
  waNumber?: string
}

export interface SyncResult {
  pulled: number
  pushed: number
  failed: number
  /** Names of people whose contact no longer exists. */
  unlinked: string[]
}

interface ContactsValue {
  available: boolean
  api: ContactSyncApi | null
  cache: Record<string, CachedContact>
  syncing: boolean
  lastResult: SyncResult | null
  /** Queue a sync with the current people (runs after pending state updates). */
  syncNow: () => void
  /** Link a person; `keep` is the birthday to keep when it differs from the contact's. */
  link: (personId: string, contact: ContactSummary, keep?: Birthday) => void
  unlink: (personId: string) => void
  unlinkAll: () => void
  setWaNumber: (lookupKey: string, normalized: string) => void
}

const ContactsContext = createContext<ContactsValue | null>(null)

const RESUME_THROTTLE_MS = 5 * 60 * 1000

function draftOf(p: Person): PersonDraft {
  const { id: _id, createdAt: _c, updatedAt: _u, ...draft } = p
  return draft
}

const birthdayOf = (b: Birthday): Birthday => ({
  month: b.month,
  day: b.day,
  ...(b.year !== undefined && { year: b.year }),
})

/** Link for a person who keeps `chosen`; the base is the contact's current birthday so the next sync writes `chosen` if it differs. */
export function buildContactLink(contact: ContactSummary, chosen: Birthday): ContactLink {
  return {
    lookupKey: contact.lookupKey,
    contactId: contact.contactId,
    synced: birthdayOf(contact.birthday ?? chosen),
    syncedAt: Date.now(),
    ...(!contact.writable && { readOnly: true }),
  }
}

export function ContactsProvider({ children, api: injected }: { children: ReactNode; api?: ContactSyncApi | null }) {
  const api = useMemo(() => (injected === undefined ? getContactSync() : injected), [injected])
  const { people, updatePerson } = useAppData()
  const [cache, setCache] = useStorage<Record<string, CachedContact>>(STORAGE_KEYS.contactCache, {})
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)
  const [requested, setRequested] = useState(0)

  const peopleRef = useRef(people)
  peopleRef.current = people
  const running = useRef(false)
  const lastRun = useRef(0)

  const patch = useCallback(
    (id: string, change: Partial<Person>) => {
      const p = peopleRef.current.find((x) => x.id === id)
      if (p) updatePerson(id, { ...draftOf(p), ...change })
    },
    [updatePerson],
  )

  const runSync = useCallback(async () => {
    if (!api || running.current) return
    const linked = peopleRef.current.filter((p) => p.contact)
    if (linked.length === 0) return
    running.current = true
    lastRun.current = Date.now()
    setSyncing(true)
    const result: SyncResult = { pulled: 0, pushed: 0, failed: 0, unlinked: [] }
    try {
      const byKey = new Map(linked.map((p) => [p.contact!.lookupKey, p]))
      const { found, missing } = await api.get([...byKey.keys()])

      for (const key of missing) {
        const p = byKey.get(key)
        if (!p) continue
        patch(p.id, { contact: undefined })
        result.unlinked.push(p.name)
      }

      let writeGranted: boolean | undefined
      const nextCache: Record<string, CachedContact> = {}
      for (const c of found) {
        const p = byKey.get(c.requestedKey)
        if (!p?.contact) continue
        nextCache[c.lookupKey] = {
          phones: c.phones,
          emails: c.emails,
          addresses: c.addresses,
          waNumber: cache[c.requestedKey]?.waNumber,
        }
        const action = resolveBirthday(p, { birthday: c.birthday, lastUpdated: c.lastUpdated, writable: c.writable })
        let synced = p.contact.synced
        let syncedAt = p.contact.syncedAt
        if (action.push) {
          writeGranted ??= await api.requestWrite().catch(() => false)
          try {
            if (!writeGranted) throw new Error('NO_PERMISSION')
            await api.setBirthday(c.lookupKey, action.push)
            synced = action.nextSynced
            syncedAt = Date.now()
            result.pushed++
          } catch {
            result.failed++
          }
        } else {
          synced = action.nextSynced
          syncedAt = Date.now()
          if (action.pull) result.pulled++
        }
        const contact = {
          lookupKey: c.lookupKey,
          contactId: c.contactId,
          synced,
          syncedAt,
          ...(!c.writable && { readOnly: true }),
        }
        patch(p.id, action.pull ? { ...birthdayOf(action.pull), contact } : { contact })
      }
      setCache(nextCache)
    } catch {
      // Permission revoked or provider error: keep links, try again next time.
      result.failed = linked.length
    } finally {
      running.current = false
      setSyncing(false)
      setLastResult(result)
    }
  }, [api, cache, patch, setCache])

  // Runs queued syncs once React has applied pending people updates (e.g. a fresh link).
  useEffect(() => {
    if (requested > 0) runSync()
  }, [requested]) // runSync intentionally not a dep: only explicit requests trigger a run

  const syncNow = useCallback(() => setRequested((n) => n + 1), [])

  // Sync on start and when the app returns to the foreground (throttled).
  useEffect(() => {
    if (!api) return
    syncNow()
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && Date.now() - lastRun.current > RESUME_THROTTLE_MS) syncNow()
    })
    return () => {
      listener.then((l) => l.remove())
    }
  }, [api, syncNow])

  const link = useCallback(
    (personId: string, contact: ContactSummary, keep?: Birthday) => {
      const p = peopleRef.current.find((x) => x.id === personId)
      if (!p) return
      const chosen = birthdayOf(keep ?? p)
      patch(personId, {
        ...chosen,
        ...(chosen.year === undefined && { year: undefined }),
        contact: buildContactLink(contact, chosen),
      })
      syncNow()
    },
    [patch, syncNow],
  )

  const unlink = useCallback((personId: string) => patch(personId, { contact: undefined }), [patch])

  const unlinkAll = useCallback(() => {
    for (const p of peopleRef.current) if (p.contact) patch(p.id, { contact: undefined })
    setCache({})
  }, [patch, setCache])

  const setWaNumber = useCallback(
    (lookupKey: string, normalized: string) =>
      setCache((prev) =>
        prev[lookupKey] ? { ...prev, [lookupKey]: { ...prev[lookupKey], waNumber: normalized } } : prev,
      ),
    [setCache],
  )

  const value: ContactsValue = {
    available: api !== null,
    api,
    cache,
    syncing,
    lastResult,
    syncNow,
    link,
    unlink,
    unlinkAll,
    setWaNumber,
  }
  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>
}

export function useContacts(): ContactsValue {
  const ctx = useContext(ContactsContext)
  if (!ctx) throw new Error('useContacts must be used inside ContactsProvider')
  return ctx
}
