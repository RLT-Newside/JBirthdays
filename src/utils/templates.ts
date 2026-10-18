// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { Person, Template } from '../types'
import { ordinal, turningAge } from './birthday'

export const DEFAULT_TEMPLATES: Template[] = [
  { id: 'tpl-classic', name: 'Classic', text: 'Happy {ordinal} birthday, {name}! 🎉' },
  { id: 'tpl-short', name: 'Short', text: 'Happy birthday {name}! 🎂' },
  {
    id: 'tpl-warm',
    name: 'Warm',
    text: 'Happy birthday {name}! Hope your day is as great as you are. Have an amazing year ahead 🥳',
  },
]

/** First word of the name — "Lena Müller" is greeted as "Lena". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

/**
 * Fill a template for a person. {age}/{ordinal} collapse away cleanly when the
 * birth year is unknown, so "Happy {ordinal} birthday" reads "Happy birthday".
 */
export function renderTemplate(text: string, person: Person, today: Date): string {
  const age = turningAge(person, today)
  return text
    .replaceAll('{name}', firstName(person.name))
    .replaceAll('{fullname}', person.name.trim())
    .replaceAll('{ordinal}', age === undefined ? '' : ordinal(age))
    .replaceAll('{age}', age === undefined ? '' : String(age))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([,.!?])/g, '$1')
    .trim()
}

export function pickTemplate(person: Person, templates: Template[], defaultId?: string): Template {
  return (
    templates.find((t) => t.id === person.templateId) ??
    templates.find((t) => t.id === defaultId) ??
    templates[0] ??
    DEFAULT_TEMPLATES[0]
  )
}
