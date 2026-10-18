import type { Person } from '../types'
import { applyImport, planImport } from './importMerge'
import type { SharePacket } from './share'

const existing: Person = {
  id: 'local1',
  name: 'Lena',
  month: 10,
  day: 24,
  tagIds: ['tFam'],
  reminderDays: [7],
  createdAt: 1,
  updatedAt: 1,
}
const state = { people: [existing], tags: [{ id: 'tFam', name: 'Family', color: '#fff' }], gifts: [] }

const packet: SharePacket = {
  app: 'jbirthdays',
  version: 1,
  people: [
    { id: 'r1', name: ' lena ', month: 10, day: 24, year: 1998, tags: ['Squad'] },
    { id: 'r2', name: 'Max', month: 3, day: 1, tags: ['family', 'Squad'] },
    { id: 'r3', name: 'max', month: 3, day: 1, tags: [] },
  ],
  gifts: [
    { personId: 'r1', text: 'Vinyl' },
    { personId: 'r2', text: 'Book' },
  ],
}

describe('planImport', () => {
  it('splits added vs matched, dedupes within packet, lists new tags', () => {
    const plan = planImport(packet, state)
    expect(plan.added.map((p) => p.id)).toEqual(['r2'])
    expect(plan.matched.map((m) => m.existing.id)).toEqual(['local1'])
    expect(plan.newTags).toEqual(['Squad'])
    expect(plan.giftCount).toBe(2)
  })
})

describe('applyImport', () => {
  const result = applyImport(packet, state, 99)

  it('keeps local data on matches but fills year and tags', () => {
    const lena = result.people.find((p) => p.id === 'local1')!
    expect(lena.year).toBe(1998)
    expect(lena.reminderDays).toEqual([7])
    const squad = result.tags.find((t) => t.name === 'Squad')!
    expect(lena.tagIds).toEqual(['tFam', squad.id])
  })

  it('counts a filled-in year as a birthday change', () => {
    expect(result.people.find((p) => p.id === 'local1')!.birthdayChangedAt).toBe(99)
  })

  it('adds new people with tags matched case-insensitively', () => {
    expect(result.people).toHaveLength(2)
    const max = result.people.find((p) => p.name === 'Max')!
    expect(max.tagIds).toHaveLength(2)
    expect(max.tagIds).toContain('tFam')
    expect(max.createdAt).toBe(99)
  })

  it('attaches gifts to local ids and skips duplicates on re-import', () => {
    expect(result.gifts.map((g) => g.text).sort()).toEqual(['Book', 'Vinyl'])
    expect(result.gifts.find((g) => g.text === 'Vinyl')!.personId).toBe('local1')
    const again = applyImport(packet, result, 100)
    expect(again.gifts).toHaveLength(2)
    expect(again.people).toHaveLength(2)
    expect(again.tags).toHaveLength(2)
  })
})
