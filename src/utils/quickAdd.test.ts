import type { Person } from '../types'
import { type QuickRow, rowStatus, rowsToDrafts } from './quickAdd'

const lena: Person = { id: 'l', name: 'Lena', month: 10, day: 24, tagIds: [], createdAt: 1, updatedAt: 1 }
const row = (over: Partial<QuickRow>): QuickRow => ({ key: 'k', name: 'Anna', day: 1, month: 1, year: '', ...over })

describe('rowStatus', () => {
  it.each([
    [row({ name: '  ' }), 'empty'],
    [row({ year: '12' }), 'invalid'],
    [row({ month: 2, day: 30 }), 'invalid'],
    [row({ name: 'lena', month: 10, day: 24 }), 'duplicate'],
    [row({ year: '1990' }), 'ok'],
  ] as const)('%j → %s', (r, status) => expect(rowStatus(r, [lena])).toBe(status))
})

describe('rowsToDrafts', () => {
  it('keeps ok rows once each, with year and tags', () => {
    const drafts = rowsToDrafts(
      [
        row({ key: 'a', year: '1990' }),
        row({ key: 'b', year: '1990' }),
        row({ key: 'c', name: '' }),
        row({ key: 'd', name: 'Lena', month: 10, day: 24 }),
      ],
      [lena],
      ['t1'],
    )
    expect(drafts).toEqual([{ name: 'Anna', month: 1, day: 1, year: 1990, tagIds: ['t1'] }])
  })
})
