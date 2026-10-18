// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { v4 as uuid } from 'uuid'
import type { GiftIdea, Person, Tag } from '../types'
import type { SharedPerson, SharePacket } from './share'

export const TAG_COLORS = ['#fb7185', '#f5e642', '#22d3ee', '#a855f7', '#4ade80', '#fb923c', '#60a5fa', '#f472b6']

export interface ImportState {
  people: Person[]
  tags: Tag[]
  gifts: GiftIdea[]
}

export interface ImportPlan {
  /** Incoming people not yet in the list. */
  added: SharedPerson[]
  /** Incoming people matched to an existing entry (by name + date). */
  matched: { incoming: SharedPerson; existing: Person }[]
  /** Tag names that will be created. */
  newTags: string[]
  giftCount: number
}

/** Ids differ between devices, so the same person is recognised by name + birthday. */
export function personKey(p: { name: string; month: number; day: number }): string {
  return `${p.name.trim().toLowerCase()}|${p.month}|${p.day}`
}

export function planImport(packet: SharePacket, state: ImportState): ImportPlan {
  const existingByKey = new Map(state.people.map((p) => [personKey(p), p]))
  const tagNames = new Set(state.tags.map((t) => t.name.toLowerCase()))
  const added: SharedPerson[] = []
  const matched: ImportPlan['matched'] = []
  const seen = new Set<string>()
  const newTags: string[] = []

  for (const p of packet.people) {
    const key = personKey(p)
    if (seen.has(key)) continue
    seen.add(key)
    const existing = existingByKey.get(key)
    if (existing) matched.push({ incoming: p, existing })
    else added.push(p)
    for (const t of p.tags) {
      if (!tagNames.has(t.toLowerCase())) {
        tagNames.add(t.toLowerCase())
        newTags.push(t)
      }
    }
  }
  return { added, matched, newTags, giftCount: packet.gifts?.length ?? 0 }
}

/**
 * Merge a packet into the current state. New people are added with the sender's
 * tags (created by name if missing). Matched people keep their local data but
 * gain any missing birth year and tags. Gift ideas attach to whichever local
 * person they map to, skipping exact duplicates.
 */
export function applyImport(packet: SharePacket, state: ImportState, now = Date.now()): ImportState {
  const plan = planImport(packet, state)
  const tags = [...state.tags]
  const tagIdByName = new Map(tags.map((t) => [t.name.toLowerCase(), t.id]))
  for (const name of plan.newTags) {
    const tag: Tag = { id: uuid(), name, color: TAG_COLORS[tags.length % TAG_COLORS.length] }
    tags.push(tag)
    tagIdByName.set(name.toLowerCase(), tag.id)
  }
  const tagIds = (names: string[]) =>
    names.map((n) => tagIdByName.get(n.toLowerCase())).filter((id): id is string => !!id)

  const localIdFor = new Map<string, string>()
  const people = state.people.map((p) => {
    const m = plan.matched.find((x) => x.existing.id === p.id)
    if (!m) return p
    localIdFor.set(m.incoming.id, p.id)
    const mergedTags = Array.from(new Set([...p.tagIds, ...tagIds(m.incoming.tags)]))
    const year = p.year ?? m.incoming.year
    const changed = year !== p.year || mergedTags.length !== p.tagIds.length
    return changed ? { ...p, year, tagIds: mergedTags, updatedAt: now } : p
  })

  for (const sp of plan.added) {
    const id = uuid()
    localIdFor.set(sp.id, id)
    people.push({
      id,
      name: sp.name,
      month: sp.month,
      day: sp.day,
      ...(sp.year !== undefined && { year: sp.year }),
      tagIds: tagIds(sp.tags),
      ...(sp.notes && { notes: sp.notes }),
      createdAt: now,
      updatedAt: now,
    })
  }

  const gifts = [...state.gifts]
  const giftKey = (personId: string, text: string) => `${personId}|${text.trim().toLowerCase()}`
  const giftKeys = new Set(gifts.map((g) => giftKey(g.personId, g.text)))
  for (const g of packet.gifts ?? []) {
    const personId = localIdFor.get(g.personId)
    if (!personId || giftKeys.has(giftKey(personId, g.text))) continue
    giftKeys.add(giftKey(personId, g.text))
    gifts.push({ ...g, id: uuid(), personId, createdAt: now })
  }

  return { people, tags, gifts }
}
