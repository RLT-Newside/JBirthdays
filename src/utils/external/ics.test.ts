import { birthdayNameFromSummary, parseIcs } from './ics'

const event = (...lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n')
const cal = (...events: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events, 'END:VCALENDAR'].join('\r\n')

describe('birthdayNameFromSummary', () => {
  it.each([
    ["Lena's birthday", 'Lena'],
    ['Lena’s Birthday', 'Lena'],
    ['🎂 Birthday: Max Muster', 'Max Muster'],
    ['Happy birthday, Anna!', 'Anna'],
    ['Geburtstag von Jonas', 'Jonas'],
    ['Jonas Geburtstag', 'Jonas'],
    ['Jonas’ Geburtstag', 'Jonas'],
  ])('extracts %s', (s, name) => expect(birthdayNameFromSummary(s)).toBe(name))

  it('returns null for normal events', () => expect(birthdayNameFromSummary('Team meeting')).toBeNull())
})

describe('parseIcs', () => {
  it('imports only birthday events from a full calendar', () => {
    const meetings = Array.from({ length: 500 }, (_, i) =>
      event(`SUMMARY:Meeting ${i}`, 'DTSTART;TZID=Europe/Zurich:20261018T090000'),
    )
    const fixture = cal(
      'X-WR-CALNAME:Birthdays',
      ...meetings,
      event("SUMMARY:Lena's birthday", 'DTSTART;VALUE=DATE:19981024', 'RRULE:FREQ=YEARLY'),
      event('SUMMARY:Sam', 'DTSTART;VALUE=DATE:16040229', 'RRULE:FREQ=YEARLY'),
    )
    const r = parseIcs(fixture)
    expect(r.entries).toEqual([
      { name: 'Lena', month: 10, day: 24, year: 1998 },
      { name: 'Sam', month: 2, day: 29 },
    ])
    expect(r.skipped).toEqual([])
  })

  it('accepts a birthday-titled one-off event and unescapes the summary', () => {
    expect(parseIcs(cal(event('SUMMARY:Birthday: Smith, J.', 'DTSTART:20000105T000000Z'))).entries).toEqual([
      { name: 'Smith, J.', month: 1, day: 5 },
    ])
  })

  it('ignores yearly events that are not birthdays outside a birthdays calendar', () => {
    const r = parseIcs(cal(event('SUMMARY:Christmas', 'DTSTART;VALUE=DATE:20151225', 'RRULE:FREQ=YEARLY')))
    expect(r).toEqual({ entries: [], skipped: [] })
  })

  it('does not take the event start year as birth year outside a birthdays calendar', () => {
    const r = parseIcs(cal(event("SUMMARY:Lena's birthday", 'DTSTART;VALUE=DATE:20151024', 'RRULE:FREQ=YEARLY')))
    expect(r.entries).toEqual([{ name: 'Lena', month: 10, day: 24 }])
  })

  it('skips a birthday event with a broken date', () => {
    expect(parseIcs(cal(event("SUMMARY:Bob's birthday", 'DTSTART:garbage'))).skipped).toEqual([
      { label: 'Bob', reason: 'Unreadable date' },
    ])
  })
})
