// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.

export type Tab = 'upcoming' | 'people' | 'share' | 'settings'

/** A birthday as stored on a person or a contact; year omitted when unknown. */
export interface Birthday {
  month: number
  day: number
  year?: number
}

export interface Person {
  id: string
  name: string
  /** 1-12 */
  month: number
  /** 1-31 */
  day: number
  /** Birth year; omitted when unknown (age is then not shown). */
  year?: number
  tagIds: string[]
  notes?: string
  /** Days before the birthday to remind; undefined = use settings default. */
  reminderDays?: number[]
  templateId?: string
  createdAt: number
  updatedAt: number
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface GiftIdea {
  id: string
  personId: string
  text: string
  link?: string
  price?: string
  /** Set once the gift was given — the idea then lives in the history. */
  givenYear?: number
  createdAt: number
}

export interface Template {
  id: string
  name: string
  /** Placeholders: {name} {age} {ordinal} */
  text: string
}

export interface Settings {
  schemaVersion: number
  defaultReminderDays: number[]
  /** Hour of day (0-23) reminders fire. */
  reminderHour: number
  defaultTemplateId?: string
  /** Name shown to friends on shared links/files. */
  shareName?: string
}

export type PersonDraft = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>
