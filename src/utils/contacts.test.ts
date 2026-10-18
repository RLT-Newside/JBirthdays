import { formatContactDate, fromRawContact, getContactSync, parseContactDate } from './contacts'

describe('contact dates', () => {
  it.each([
    ['1998-10-24', { month: 10, day: 24, year: 1998 }],
    ['--02-29', { month: 2, day: 29 }],
    ['--0229', { month: 2, day: 29 }],
  ])('parses %s', (raw, out) => expect(parseContactDate(raw)).toEqual(out))

  it.each(['garbage', '', '2001-02-29'])('rejects %j', (raw) => expect(parseContactDate(raw)).toBeNull())

  it('formats for the contacts provider', () => {
    expect(formatContactDate({ month: 2, day: 9 })).toBe('--02-09')
    expect(formatContactDate({ month: 10, day: 24, year: 1998 })).toBe('1998-10-24')
  })
})

describe('getContactSync', () => {
  it('is unavailable on the web', () => expect(getContactSync()).toBeNull())
})

describe('fromRawContact', () => {
  it('flags a birthday string it cannot read', () => {
    const raw = { lookupKey: 'k', contactId: '1', name: 'A', writable: true, birthday: '05/12/1990' }
    expect(fromRawContact(raw)).toEqual({
      lookupKey: 'k',
      contactId: '1',
      name: 'A',
      writable: true,
      birthdayUnreadable: true,
    })
    expect(fromRawContact({ ...raw, birthday: '--05-12' }).birthday).toEqual({ month: 5, day: 12 })
    expect(fromRawContact({ ...raw, birthday: null })).not.toHaveProperty('birthdayUnreadable')
  })
})
