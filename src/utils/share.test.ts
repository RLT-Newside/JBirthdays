import type { GiftIdea, Person, Tag } from '../types'
import { buildPacket, buildShareLink, decodePacket, encodePacket, parsePacket, readShareHash } from './share'

const tags: Tag[] = [{ id: 't1', name: 'Squad', color: '#fff' }]
const people: Person[] = [
  {
    id: 'p1',
    name: 'Lena',
    month: 10,
    day: 24,
    year: 1998,
    tagIds: ['t1', 'missing'],
    notes: 'secret',
    reminderDays: [3],
    templateId: 'x',
    createdAt: 1,
    updatedAt: 1,
  },
  { id: 'p2', name: 'Max', month: 2, day: 29, tagIds: [], createdAt: 1, updatedAt: 1 },
]
const gifts: GiftIdea[] = [{ id: 'g1', personId: 'p1', text: 'Vinyl', createdAt: 1 }]

describe('buildPacket', () => {
  it('strips local and private fields by default', () => {
    const pk = buildPacket(people, tags, gifts, { includePrivate: false })
    expect(pk.people[0]).toEqual({ id: 'p1', name: 'Lena', month: 10, day: 24, year: 1998, tags: ['Squad'] })
    expect(pk.people[1]).not.toHaveProperty('year')
    expect(pk.gifts).toBeUndefined()
  })
  it('includes notes and gifts when opted in', () => {
    const pk = buildPacket(people, tags, gifts, { includePrivate: true, from: ' Justin ' })
    expect(pk.people[0].notes).toBe('secret')
    expect(pk.gifts).toEqual([{ personId: 'p1', text: 'Vinyl' }])
    expect(pk.from).toBe('Justin')
  })
})

describe('parsePacket', () => {
  it('rejects foreign or malformed input', () => {
    expect(parsePacket(null)).toBeNull()
    expect(parsePacket({ app: 'other', version: 1, people: [] })).toBeNull()
    expect(parsePacket({ app: 'jbirthdays', version: 2, people: [] })).toBeNull()
  })
  it('drops invalid people and gifts, sanitises links', () => {
    const pk = parsePacket({
      app: 'jbirthdays',
      version: 1,
      people: [
        { id: 'a', name: 'Ok', month: 1, day: 1 },
        { id: 'b', name: 'Bad month', month: 13, day: 1 },
        { id: 'f', name: 'Feb 31', month: 2, day: 31 },
        { id: 'g', name: 'Leap', month: 2, day: 29 },
        { id: 'c', name: '', month: 1, day: 1 },
        'junk',
      ],
      gifts: [
        { personId: 'a', text: 'x', link: 'javascript:alert(1)' },
        { personId: 'zzz', text: 'orphan' },
      ],
    })
    expect(pk?.people.map((p) => p.id)).toEqual(['a', 'g'])
    expect(pk?.gifts).toEqual([{ personId: 'a', text: 'x' }])
  })
})

describe('link encoding', () => {
  it('round-trips through encode/decode', async () => {
    const pk = buildPacket(people, tags, gifts, { includePrivate: true })
    const enc = await encodePacket(pk)
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(await decodePacket(enc)).toEqual(pk)
  })
  it('returns null for garbage', async () => {
    expect(await decodePacket('not*valid')).toBeNull()
    expect(await decodePacket('AAAA')).toBeNull()
  })
  it('builds a link whose hash reads back', async () => {
    const pk = buildPacket(people, tags, gifts, { includePrivate: false })
    const link = await buildShareLink(pk, 'https://x.test/')
    const hash = link.slice(link.indexOf('#'))
    expect(await decodePacket(readShareHash(hash)!)).toEqual(pk)
  })
})
