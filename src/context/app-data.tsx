// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { App } from '@capacitor/app'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { SCHEMA_VERSION, STORAGE_KEYS } from '../data/storage'
import { useStorage } from '../hooks/useStorage'
import type { GiftIdea, Person, PersonDraft, Settings, Tab, Tag, Template } from '../types'
import type { Backup } from '../utils/backup'
import { applyImport } from '../utils/importMerge'
import type { PendingImport } from '../utils/importSource'
import {
  buildSchedule,
  getNotificationStatus,
  type NotificationStatus,
  requestNotificationPermission,
  syncReminders,
} from '../utils/notifications'
import type { SharePacket } from '../utils/share'
import { DEFAULT_TEMPLATES } from '../utils/templates'

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SCHEMA_VERSION,
  defaultReminderDays: [7, 0],
  reminderHour: 9,
}

interface AppData {
  tab: Tab
  setTab: (tab: Tab) => void

  people: Person[]
  tags: Tag[]
  gifts: GiftIdea[]
  templates: Template[]
  settings: Settings

  addPerson: (draft: PersonDraft) => Person
  updatePerson: (id: string, draft: PersonDraft) => void
  deletePerson: (id: string) => void

  addTag: (name: string, color: string) => Tag
  updateTag: (id: string, patch: Partial<Omit<Tag, 'id'>>) => void
  deleteTag: (id: string) => void

  addGift: (personId: string, text: string, extra?: Pick<GiftIdea, 'link' | 'price'>) => void
  updateGift: (id: string, patch: Partial<Omit<GiftIdea, 'id' | 'personId'>>) => void
  deleteGift: (id: string) => void

  saveTemplate: (template: Omit<Template, 'id'> & { id?: string }) => void
  deleteTemplate: (id: string) => void

  updateSettings: (patch: Partial<Settings>) => void

  importPacket: (packet: SharePacket) => void
  /** Packet awaiting the user's confirmation in the import dialog. */
  pendingImport: PendingImport | null
  setPendingImport: (pending: PendingImport | null) => void
  /** Full backup awaiting merge/replace confirmation. */
  pendingBackup: Backup | null
  setPendingBackup: (backup: Backup | null) => void

  /** Person shown in the detail sheet; null = closed. */
  viewingId: string | null
  setViewingId: (id: string | null) => void
  /** Person being edited; 'new' = add form; null = closed. */
  editingId: string | 'new' | null
  setEditingId: (id: string | 'new' | null) => void

  notificationStatus: NotificationStatus
  enableNotifications: () => Promise<void>
}

const AppDataContext = createContext<AppData | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>('upcoming')
  const [people, setPeople] = useStorage<Person[]>(STORAGE_KEYS.people, [])
  const [tags, setTags] = useStorage<Tag[]>(STORAGE_KEYS.tags, [])
  const [gifts, setGifts] = useStorage<GiftIdea[]>(STORAGE_KEYS.gifts, [])
  const [templates, setTemplates] = useStorage<Template[]>(STORAGE_KEYS.templates, DEFAULT_TEMPLATES)
  const [storedSettings, setSettings] = useStorage<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('unsupported')
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [pendingBackup, setPendingBackup] = useState<Backup | null>(null)

  // Fill fields added in later versions from defaults.
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...storedSettings }), [storedSettings])

  const addPerson = useCallback(
    (draft: PersonDraft) => {
      const now = Date.now()
      const person: Person = { ...draft, id: uuid(), createdAt: now, updatedAt: now }
      setPeople((prev) => [...prev, person])
      return person
    },
    [setPeople],
  )

  const updatePerson = useCallback(
    (id: string, draft: PersonDraft) => {
      setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...draft, updatedAt: Date.now() } : p)))
    },
    [setPeople],
  )

  const deletePerson = useCallback(
    (id: string) => {
      setPeople((prev) => prev.filter((p) => p.id !== id))
      setGifts((prev) => prev.filter((g) => g.personId !== id))
    },
    [setPeople, setGifts],
  )

  const addTag = useCallback(
    (name: string, color: string) => {
      const tag: Tag = { id: uuid(), name: name.trim(), color }
      setTags((prev) => [...prev, tag])
      return tag
    },
    [setTags],
  )

  const updateTag = useCallback(
    (id: string, patch: Partial<Omit<Tag, 'id'>>) => {
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    },
    [setTags],
  )

  const deleteTag = useCallback(
    (id: string) => {
      setTags((prev) => prev.filter((t) => t.id !== id))
      setPeople((prev) =>
        prev.map((p) => (p.tagIds.includes(id) ? { ...p, tagIds: p.tagIds.filter((t) => t !== id) } : p)),
      )
    },
    [setTags, setPeople],
  )

  const addGift = useCallback(
    (personId: string, text: string, extra: Pick<GiftIdea, 'link' | 'price'> = {}) => {
      setGifts((prev) => [...prev, { id: uuid(), personId, text: text.trim(), ...extra, createdAt: Date.now() }])
    },
    [setGifts],
  )

  const updateGift = useCallback(
    (id: string, patch: Partial<Omit<GiftIdea, 'id' | 'personId'>>) => {
      setGifts((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
    },
    [setGifts],
  )

  const deleteGift = useCallback(
    (id: string) => {
      setGifts((prev) => prev.filter((g) => g.id !== id))
    },
    [setGifts],
  )

  const saveTemplate = useCallback(
    (template: Omit<Template, 'id'> & { id?: string }) => {
      setTemplates((prev) =>
        template.id && prev.some((t) => t.id === template.id)
          ? prev.map((t) => (t.id === template.id ? { ...t, ...template, id: t.id } : t))
          : [...prev, { ...template, id: uuid() }],
      )
    },
    [setTemplates],
  )

  const deleteTemplate = useCallback(
    (id: string) => {
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    },
    [setTemplates],
  )

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...patch }))
    },
    [setSettings],
  )

  const importPacket = useCallback(
    (packet: SharePacket) => {
      const next = applyImport(packet, { people, tags, gifts })
      setPeople(next.people)
      setTags(next.tags)
      setGifts(next.gifts)
    },
    [people, tags, gifts, setPeople, setTags, setGifts],
  )

  // ─── Reminders ───

  const refreshStatus = useCallback(async () => {
    setNotificationStatus(await getNotificationStatus())
  }, [])

  const enableNotifications = useCallback(async () => {
    setNotificationStatus(await requestNotificationPermission())
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // Ask once, the first time someone is added — the moment reminders matter.
  useEffect(() => {
    if (people.length > 0 && notificationStatus === 'prompt') enableNotifications()
  }, [people.length > 0, notificationStatus])

  // Reschedule on every relevant change and whenever the app returns to the
  // foreground, so the rolling one-year queue never runs dry.
  useEffect(() => {
    if (notificationStatus !== 'granted') return
    const sync = () => syncReminders(buildSchedule(people, gifts, settings, new Date()))
    sync()
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        refreshStatus()
        sync()
      }
    })
    return () => {
      listener.then((l) => l.remove())
    }
  }, [people, gifts, settings, notificationStatus, refreshStatus])

  const value: AppData = {
    tab,
    setTab,
    people,
    tags,
    gifts,
    templates,
    settings,
    addPerson,
    updatePerson,
    deletePerson,
    addTag,
    updateTag,
    deleteTag,
    addGift,
    updateGift,
    deleteGift,
    saveTemplate,
    deleteTemplate,
    updateSettings,
    importPacket,
    pendingImport,
    setPendingImport,
    pendingBackup,
    setPendingBackup,
    viewingId,
    setViewingId,
    editingId,
    setEditingId,
    notificationStatus,
    enableNotifications,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider')
  return ctx
}
