// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { parseDateToken } from './dates'
import { splitProperty, unescapeValue, unfoldLines } from './text'
import type { ExternalResult } from './types'

/** Read FN/N + BDAY from a vCard file (one or many cards). Cards without BDAY are ignored. */
export function parseVcf(text: string): ExternalResult {
  const result: ExternalResult = { entries: [], skipped: [] }
  let card: Record<string, string> | null = null

  for (const line of unfoldLines(text)) {
    const prop = splitProperty(line)
    if (!prop) continue
    if (prop.name === 'BEGIN' && prop.value.trim().toUpperCase() === 'VCARD') card = {}
    else if (prop.name === 'END' && prop.value.trim().toUpperCase() === 'VCARD' && card) {
      addCard(card, result)
      card = null
    } else if (card && !(prop.name in card)) card[prop.name] = prop.value
  }
  return result
}

function cardName(card: Record<string, string>): string {
  const fn = unescapeValue(card.FN ?? '').trim()
  if (fn) return fn
  const [family = '', given = ''] = (card.N ?? '').split(';').map((p) => unescapeValue(p).trim())
  return [given, family].filter(Boolean).join(' ')
}

function addCard(card: Record<string, string>, result: ExternalResult) {
  if (!card.BDAY) return
  const name = cardName(card)
  if (!name) return
  const date = parseDateToken(card.BDAY)
  if (!date || date === 'ambiguous') result.skipped.push({ label: name, reason: 'Unreadable date' })
  else result.entries.push({ name, ...date })
}
