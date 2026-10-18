import type { Person } from '../types'
import { findPersonMatch, normalizeName } from './contactMatch'
import type { ContactSummary } from './contacts'

const person = (over: Partial<Person>): Person => ({
  id: 'p',
  name: 'x',
  month: 1,
  day: 1,
  tagIds: [],
  createdAt: 1,
  updatedAt: 1,
  ...over,
})
const contact = (over: Partial<ContactSummary>): ContactSummary => ({
  lookupKey: 'k',
  contactId: '1',
  name: 'x',
  writable: true,
  ...over,
})

describe('normalizeName', () => {
  it('ignores case, accents, ß and extra spaces', () => {
    expect(normalizeName('  Lena  Müller ')).toBe(normalizeName('lena muller'))
    expect(normalizeName('Strauß')).toBe('strauss')
  })
})

describe('findPersonMatch', () => {
  it('matches the same name spelled differently', () => {
    const lena = person({ id: 'l', name: 'lena muller' })
    expect(findPersonMatch(contact({ name: 'Lena Müller' }), [lena])).toBe(lena)
  })

  it('ignores people already linked to a contact', () => {
    const linked = person({
      name: 'Lena Müller',
      contact: { lookupKey: 'z', synced: { month: 1, day: 1 }, syncedAt: 1 },
    })
    expect(findPersonMatch(contact({ name: 'Lena Müller' }), [linked])).toBeUndefined()
  })

  it('matches a short app name by first name and same birthday', () => {
    const max = person({ id: 'm', name: 'Max', month: 3, day: 1 })
    expect(findPersonMatch(contact({ name: 'Max Muster', birthday: { month: 3, day: 1 } }), [max])).toBe(max)
    expect(findPersonMatch(contact({ name: 'Max Muster', birthday: { month: 4, day: 1 } }), [max])).toBeUndefined()
  })
})
