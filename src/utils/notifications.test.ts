import type { Person, Settings } from '../types'
import { buildSchedule } from './notifications'

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }))

const settings: Settings = { schemaVersion: 1, defaultReminderDays: [7, 0], reminderHour: 9 }
const person = (over: Partial<Person> = {}): Person => ({
  id: 'p',
  name: 'Lena Müller',
  month: 10,
  day: 24,
  year: 1998,
  tagIds: [],
  createdAt: 0,
  updatedAt: 0,
  ...over,
})

describe('buildSchedule', () => {
  const now = new Date(2026, 9, 18, 12) // Oct 18, noon

  it('moves passed lead times to next year and sorts soonest first', () => {
    const s = buildSchedule([person()], [], settings, now)
    // 7-day reminder (Oct 17) already passed → 2027; day-of (Oct 24) is ahead.
    expect(s.map((r) => r.at)).toEqual([new Date(2026, 9, 24, 9), new Date(2027, 9, 17, 9)])
    expect(s[0].title).toBe("🎂 Lena's birthday is today")
    expect(s[0].body).toContain('Turning 28')
    expect(s[1].body).toContain('Turning 29')
    expect(s.map((r) => r.id)).toEqual([1, 2])
  })

  it('uses per-person lead times and mentions open gift ideas', () => {
    const s = buildSchedule(
      [person({ reminderDays: [3], year: undefined })],
      [
        { id: 'g', personId: 'p', text: 'Vinyl', createdAt: 0 },
        { id: 'h', personId: 'p', text: 'Old', givenYear: 2025, createdAt: 0 },
      ],
      settings,
      now,
    )
    expect(s).toHaveLength(1)
    expect(s[0].at).toEqual(new Date(2026, 9, 21, 9))
    expect(s[0].title).toBe("🎁 Lena's birthday in 3 days")
    expect(s[0].body).toBe('Gift ideas: Vinyl')
  })

  it('schedules today when the hour is still ahead', () => {
    const early = new Date(2026, 9, 24, 7)
    expect(buildSchedule([person({ reminderDays: [0] })], [], settings, early)[0].at).toEqual(new Date(2026, 9, 24, 9))
  })
})
