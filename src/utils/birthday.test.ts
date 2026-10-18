import type { Person } from '../types'
import { daysUntil, formatBirthday, isMilestone, nextOccurrence, ordinal, sortUpcoming, turningAge } from './birthday'

const p = (month: number, day: number, year?: number, name = 'X'): Person => ({
  id: name,
  name,
  month,
  day,
  year,
  tagIds: [],
  createdAt: 0,
  updatedAt: 0,
})

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

describe('nextOccurrence', () => {
  it('returns this year when still ahead', () => {
    expect(nextOccurrence(p(12, 24), d(2026, 10, 18))).toEqual(d(2026, 12, 24))
  })
  it('rolls over to next year when passed', () => {
    expect(nextOccurrence(p(1, 5), d(2026, 10, 18))).toEqual(d(2027, 1, 5))
  })
  it('treats today as the occurrence', () => {
    expect(nextOccurrence(p(10, 18), new Date(2026, 9, 18, 23, 30))).toEqual(d(2026, 10, 18))
  })
  it('maps Feb 29 to Feb 28 in non-leap years', () => {
    expect(nextOccurrence(p(2, 29), d(2026, 10, 18))).toEqual(d(2027, 2, 28))
  })
  it('keeps Feb 29 in leap years', () => {
    expect(nextOccurrence(p(2, 29), d(2027, 10, 18))).toEqual(d(2028, 2, 29))
  })
})

describe('daysUntil', () => {
  it('is 0 on the day', () => {
    expect(daysUntil(p(10, 18), new Date(2026, 9, 18, 9))).toBe(0)
  })
  it('counts across year end', () => {
    expect(daysUntil(p(1, 1), d(2026, 12, 31))).toBe(1)
  })
  it('is not thrown off by DST changes', () => {
    expect(daysUntil(p(11, 1), d(2026, 10, 18))).toBe(14)
  })
})

describe('turningAge', () => {
  it('is undefined without a year', () => {
    expect(turningAge(p(5, 5), d(2026, 1, 1))).toBeUndefined()
  })
  it('uses the next occurrence year', () => {
    expect(turningAge(p(12, 24, 2000), d(2026, 10, 18))).toBe(26)
    expect(turningAge(p(1, 5, 2000), d(2026, 10, 18))).toBe(27)
  })
  it('counts today as turning', () => {
    expect(turningAge(p(10, 18, 1998), d(2026, 10, 18))).toBe(28)
  })
})

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [101, '101st'],
    [112, '112th'],
  ])('%i -> %s', (n, s) => {
    expect(ordinal(n)).toBe(s)
  })
})

describe('isMilestone', () => {
  it('flags round decades and coming-of-age', () => {
    expect([18, 21, 30, 40, 50, 100].every(isMilestone)).toBe(true)
    expect([17, 25, 31, undefined].some(isMilestone)).toBe(false)
  })
})

describe('sortUpcoming', () => {
  it('orders by days until, then name', () => {
    const list = [
      p(1, 5, undefined, 'C'),
      p(10, 18, undefined, 'B'),
      p(12, 1, undefined, 'A'),
      p(10, 18, undefined, 'A'),
    ]
    expect(sortUpcoming(list, d(2026, 10, 18)).map((x) => x.person.name + x.days)).toEqual(['A0', 'B0', 'A44', 'C79'])
  })
})

describe('formatBirthday', () => {
  it('formats with and without year', () => {
    expect(formatBirthday(p(3, 7, 1990))).toBe('7 Mar 1990')
    expect(formatBirthday(p(3, 7))).toBe('7 Mar')
  })
})
