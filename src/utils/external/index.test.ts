import { detectExternal, toPacket } from './index'

describe('detectExternal', () => {
  it.each([
    ['BEGIN:VCALENDAR\r\nEND:VCALENDAR', 'calendar'],
    ['﻿  BEGIN:VCARD\nEND:VCARD', 'contacts'],
    ['name,birthday\nLena,1998-10-24', 'spreadsheet'],
    ['Name;Geburtstag', 'spreadsheet'],
  ])('detects %j', (text, format) => expect(detectExternal(text)).toBe(format))

  it.each(['{"app":"jbirthdays"}', 'just words', ''])('ignores %j', (text) => expect(detectExternal(text)).toBeNull())
})

describe('toPacket', () => {
  it('builds a deduped share packet without a sender', () => {
    const packet = toPacket([
      { name: 'Lena', month: 10, day: 24, year: 1998 },
      { name: 'lena ', month: 10, day: 24 },
      { name: 'Max', month: 2, day: 29 },
    ])
    expect(packet).toEqual({
      app: 'jbirthdays',
      version: 1,
      people: [
        { id: 'ext-0', name: 'Lena', month: 10, day: 24, year: 1998, tags: [] },
        { id: 'ext-2', name: 'Max', month: 2, day: 29, tags: [] },
      ],
    })
  })
})
