import { applyBackup, createBackup, isBackup } from './backup'

describe('backup', () => {
  beforeEach(() => {
    localStorage.setItem('bday_people', JSON.stringify([{ id: 'a' }]))
    localStorage.setItem('bday_settings', JSON.stringify({ reminderHour: 8 }))
    localStorage.setItem('other_key', '"x"')
  })

  it('exports only bday_ keys', () => {
    const b = createBackup()
    expect(isBackup(b)).toBe(true)
    expect(Object.keys(b.data).sort()).toEqual(['bday_people', 'bday_settings'])
  })

  it('merge appends unseen ids and keeps current settings', () => {
    applyBackup(
      {
        app: 'jbirthdays-backup',
        schemaVersion: 1,
        exportedAt: '',
        data: { bday_people: [{ id: 'a' }, { id: 'b' }], bday_settings: { reminderHour: 20 }, evil: 1 },
      },
      'merge',
    )
    expect(JSON.parse(localStorage.getItem('bday_people')!)).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(JSON.parse(localStorage.getItem('bday_settings')!).reminderHour).toBe(8)
    expect(localStorage.getItem('evil')).toBeNull()
  })

  it('replace wipes bday_ keys first', () => {
    applyBackup({ app: 'jbirthdays-backup', schemaVersion: 1, exportedAt: '', data: { bday_tags: [] } }, 'replace')
    expect(localStorage.getItem('bday_people')).toBeNull()
    expect(localStorage.getItem('bday_tags')).toBe('[]')
    expect(localStorage.getItem('other_key')).toBe('"x"')
  })
})
