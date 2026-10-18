// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.

/**
 * Central registry of every localStorage key the app uses. All keys share the
 * `bday_` prefix so backup import/export can find them by prefix.
 */
export const BDAY_KEY_PREFIX = 'bday_'

export const STORAGE_KEYS = {
  // Core user data (backed up / imported).
  people: 'bday_people',
  tags: 'bday_tags',
  gifts: 'bday_gifts',
  templates: 'bday_templates',
  settings: 'bday_settings',
  // Preferences / UI.
  theme: 'bday_theme',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

export const SCHEMA_VERSION = 1
