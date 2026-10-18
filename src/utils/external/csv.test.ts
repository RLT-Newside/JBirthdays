import { parseCsv } from './csv'

describe('parseCsv', () => {
  it('handles BOM, CRLF and semicolons (Excel export)', () => {
    const text = '\uFEFFName;Geburtstag\r\nLena Müller;24.10.1998\r\n"Rossi; Maria";--02-29\r\n'
    expect(parseCsv(text).entries).toEqual([
      { name: 'Lena Müller', month: 10, day: 24, year: 1998 },
      { name: 'Rossi; Maria', month: 2, day: 29 },
    ])
  })

  it('joins first/last name and reads day/month/year columns', () => {
    expect(parseCsv('First Name,Last Name,Day,Month,Year\nAnna,Meier,3,7,\n').entries).toEqual([
      { name: 'Anna Meier', month: 7, day: 3 },
    ])
  })

  it('supports quoted fields with escaped quotes', () => {
    expect(parseCsv('name,birthday\n"Max ""Maxi"" Muster",1990-01-02\n').entries).toEqual([
      { name: 'Max "Maxi" Muster', month: 1, day: 2, year: 1990 },
    ])
  })

  it('infers slash order from the file and skips ambiguous rows otherwise', () => {
    expect(parseCsv('name,birthday\nA,25/12/1990\nB,03/04/1991\n').entries[1]).toEqual({
      name: 'B',
      month: 4,
      day: 3,
      year: 1991,
    })
    expect(parseCsv('name,birthday\nB,03/04/1991\n').skipped).toEqual([
      { label: 'B', reason: 'Ambiguous date (day/month?)' },
    ])
  })

  it('accepts headerless name,date', () => {
    expect(parseCsv('Max,1990-01-02\n').entries).toEqual([{ name: 'Max', month: 1, day: 2, year: 1990 }])
  })

  it('skips unreadable dates and ignores rows without a name', () => {
    const r = parseCsv('name,birthday\nZed,someday\n,1990-01-01\n')
    expect(r.entries).toEqual([])
    expect(r.skipped).toEqual([{ label: 'Zed', reason: 'Unreadable date' }])
  })
})
