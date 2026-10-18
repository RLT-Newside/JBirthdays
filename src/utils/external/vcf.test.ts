import { parseVcf } from './vcf'

const card = (...lines: string[]) => ['BEGIN:VCARD', 'VERSION:3.0', ...lines, 'END:VCARD'].join('\r\n')

const fixture = `﻿${[
  card('FN:Lena Müller', 'BDAY:1998-10-24'),
  card('N:Rossi;Maria;;;', 'BDAY;VALUE=date:--0229'),
  card('FN:No Birthday', 'TEL:+41791234567'),
  card('FN:Bad', 'BDAY:soon'),
  card('FN:Very Long', '  Name', 'BDAY:19900102'),
].join('\r\n')}\r\n`

describe('parseVcf', () => {
  it('reads names and birthdays, skipping cards without BDAY', () => {
    const r = parseVcf(fixture)
    expect(r.entries).toEqual([
      { name: 'Lena Müller', month: 10, day: 24, year: 1998 },
      { name: 'Maria Rossi', month: 2, day: 29 },
      { name: 'Very Long Name', month: 1, day: 2, year: 1990 },
    ])
    expect(r.skipped).toEqual([{ label: 'Bad', reason: 'Unreadable date' }])
  })

  it('unescapes values and drops placeholder years', () => {
    const r = parseVcf(card('FN:Smith, John', 'BDAY:1604-05-06'))
    expect(r.entries).toEqual([{ name: 'Smith, John', month: 5, day: 6 }])
  })
})
