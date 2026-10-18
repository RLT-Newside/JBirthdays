import { isPlaceholderYear, parseDateToken } from './dates'

describe('parseDateToken', () => {
  it.each([
    ['1990-03-15', { month: 3, day: 15, year: 1990 }],
    ['19900315', { month: 3, day: 15, year: 1990 }],
    ['--03-15', { month: 3, day: 15 }],
    ['--0229', { month: 2, day: 29 }],
    ['--02-29', { month: 2, day: 29 }],
    ['15.03.1990', { month: 3, day: 15, year: 1990 }],
    ['5.3.1990', { month: 3, day: 5, year: 1990 }],
    ['15.03.', { month: 3, day: 15 }],
    ['15/03/1990', { month: 3, day: 15, year: 1990 }],
    ['03/15/1990', { month: 3, day: 15, year: 1990 }],
    ['1990-03-15T00:00:00Z', { month: 3, day: 15, year: 1990 }],
  ])('parses %s', (raw, out) => expect(parseDateToken(raw)).toEqual(out))

  it('flags ambiguous slash dates unless an order is given', () => {
    expect(parseDateToken('03/04/1990')).toBe('ambiguous')
    expect(parseDateToken('03/04/1990', 'dmy')).toEqual({ month: 4, day: 3, year: 1990 })
    expect(parseDateToken('03/04/1990', 'mdy')).toEqual({ month: 3, day: 4, year: 1990 })
  })

  it.each(['1990-02-30', '--13-01', 'hello', ''])('rejects %s', (raw) => expect(parseDateToken(raw)).toBeNull())
})

describe('isPlaceholderYear', () => {
  it('detects placeholder years', () => {
    expect(isPlaceholderYear(1604)).toBe(true)
    expect(isPlaceholderYear(1900)).toBe(true)
    expect(isPlaceholderYear(0)).toBe(true)
    expect(isPlaceholderYear(1987)).toBe(false)
  })
})
