import type { Birthday, Person } from '../types'
import { type ContactSnapshot, resolveBirthday, sameBirthday } from './contactSync'

const base: Birthday = { month: 3, day: 15, year: 1990 }
const other: Birthday = { month: 4, day: 2, year: 1990 }
const third: Birthday = { month: 5, day: 9 }

function person(b: Birthday, changedAt = 100): Person {
  return {
    id: 'p',
    name: 'Lena',
    ...b,
    tagIds: [],
    createdAt: 1,
    updatedAt: 999,
    birthdayChangedAt: changedAt,
    contact: { lookupKey: 'k', synced: base, syncedAt: 50 },
  }
}
const contact = (birthday: Birthday | undefined, lastUpdated = 100, writable = true): ContactSnapshot => ({
  birthday,
  lastUpdated,
  writable,
})

describe('sameBirthday', () => {
  it('compares month, day and year', () => {
    expect(sameBirthday({ month: 3, day: 15 }, { month: 3, day: 15 })).toBe(true)
    expect(sameBirthday({ month: 3, day: 15 }, { month: 3, day: 15, year: 1990 })).toBe(false)
    expect(sameBirthday(undefined, { month: 3, day: 15 })).toBe(false)
  })
})

describe('resolveBirthday', () => {
  it('contact without birthday → push the app birthday', () => {
    expect(resolveBirthday(person(base), contact(undefined))).toEqual({ push: base, nextSynced: base })
  })
  it('contact birthday that cannot be read → never overwritten', () => {
    expect(resolveBirthday(person(base), { ...contact(undefined), birthdayUnreadable: true })).toEqual({
      nextSynced: base,
    })
  })
  it('contact without birthday, read-only → nothing to write', () => {
    expect(resolveBirthday(person(base), contact(undefined, 100, false))).toEqual({ nextSynced: base })
  })
  it('nothing changed → nothing', () => {
    expect(resolveBirthday(person(base), contact(base))).toEqual({ nextSynced: base })
  })
  it('only the app changed → push', () => {
    expect(resolveBirthday(person(other), contact(base))).toEqual({ push: other, nextSynced: other })
  })
  it('only the app changed, read-only → nothing, base kept', () => {
    expect(resolveBirthday(person(other), contact(base, 100, false))).toEqual({ nextSynced: base })
  })
  it('only the contact changed → pull', () => {
    expect(resolveBirthday(person(base), contact(other))).toEqual({ pull: other, nextSynced: other })
  })
  it('both changed to the same value → nothing to do', () => {
    expect(resolveBirthday(person(other), contact(other))).toEqual({ nextSynced: other })
  })
  it('both changed differently → newer app change wins', () => {
    expect(resolveBirthday(person(other, 300), contact(third, 200))).toEqual({ push: other, nextSynced: other })
  })
  it('both changed differently → newer contact change wins', () => {
    expect(resolveBirthday(person(other, 100), contact(third, 200))).toEqual({ pull: third, nextSynced: third })
  })
  it('both changed differently, read-only → contact always wins', () => {
    expect(resolveBirthday(person(other, 300), contact(third, 200, false))).toEqual({ pull: third, nextSynced: third })
  })
  it('falls back to updatedAt when birthdayChangedAt is missing', () => {
    const p = { ...person(other), birthdayChangedAt: undefined }
    expect(resolveBirthday(p, contact(third, 500))).toEqual({ push: other, nextSynced: other })
  })
  it('removing the year in the app is a normal change', () => {
    expect(resolveBirthday(person({ month: 3, day: 15 }), contact(base))).toEqual({
      push: { month: 3, day: 15 },
      nextSynced: { month: 3, day: 15 },
    })
  })
})
