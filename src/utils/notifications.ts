// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { GiftIdea, Person, Settings } from '../types'
import { nextOccurrence, occurrenceInYear, turningAge } from './birthday'
import { firstName } from './templates'

export interface ScheduledReminder {
  id: number
  personId: string
  title: string
  body: string
  at: Date
}

/** Android caps pending alarms per app (~500); stay well below it. */
const MAX_PENDING = 400

function reminderBody(person: Person, daysBefore: number, at: Date, gifts: GiftIdea[]): string {
  const birthday = new Date(at.getFullYear(), at.getMonth(), at.getDate() + daysBefore)
  const age = turningAge(person, birthday)
  const turning = age === undefined ? '' : `Turning ${age}. `
  const ideas = gifts.filter((g) => g.personId === person.id && g.givenYear === undefined).map((g) => g.text)
  if (daysBefore === 0) return `${turning}Tap to send your wishes.`
  if (ideas.length > 0) return `${turning}Gift ideas: ${ideas.slice(0, 3).join(', ')}`
  return `${turning}Time to think about a gift.`
}

function reminderTitle(person: Person, daysBefore: number): string {
  const name = firstName(person.name)
  if (daysBefore === 0) return `🎂 ${name}'s birthday is today`
  if (daysBefore === 1) return `🎁 ${name}'s birthday is tomorrow`
  return `🎁 ${name}'s birthday in ${daysBefore} days`
}

/**
 * Every reminder due within the next year, soonest first. Each person gets one
 * alarm per lead time; a lead time whose moment has already passed this cycle
 * moves to next year's birthday. Rescheduling on each app start/resume and on
 * every data change keeps the queue rolling forward.
 */
export function buildSchedule(people: Person[], gifts: GiftIdea[], settings: Settings, now: Date): ScheduledReminder[] {
  const out: Omit<ScheduledReminder, 'id'>[] = []
  for (const person of people) {
    const leadTimes = Array.from(new Set(person.reminderDays ?? settings.defaultReminderDays))
    for (const daysBefore of leadTimes) {
      if (!Number.isInteger(daysBefore) || daysBefore < 0 || daysBefore > 60) continue
      let birthday = nextOccurrence(person, now)
      let at = new Date(
        birthday.getFullYear(),
        birthday.getMonth(),
        birthday.getDate() - daysBefore,
        settings.reminderHour,
      )
      if (at <= now) {
        birthday = occurrenceInYear(person, birthday.getFullYear() + 1)
        at = new Date(
          birthday.getFullYear(),
          birthday.getMonth(),
          birthday.getDate() - daysBefore,
          settings.reminderHour,
        )
      }
      out.push({
        personId: person.id,
        title: reminderTitle(person, daysBefore),
        body: reminderBody(person, daysBefore, at, gifts),
        at,
      })
    }
  }
  return out
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_PENDING)
    .map((r, i) => ({ ...r, id: i + 1 }))
}

export type NotificationStatus = 'granted' | 'denied' | 'prompt' | 'unsupported'

export async function getNotificationStatus(): Promise<NotificationStatus> {
  if (!Capacitor.isNativePlatform()) return 'unsupported'
  try {
    const { display } = await LocalNotifications.checkPermissions()
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'unsupported'
  }
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (!Capacitor.isNativePlatform()) return 'unsupported'
  try {
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'unsupported'
  }
}

/** Replace every pending reminder with a fresh schedule. No-op on web. */
export async function syncReminders(schedule: ScheduledReminder[]): Promise<void> {
  if ((await getNotificationStatus()) !== 'granted') return
  try {
    const { notifications } = await LocalNotifications.getPending()
    if (notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: notifications.map((n) => ({ id: n.id })) })
    }
    if (schedule.length === 0) return
    await LocalNotifications.schedule({
      notifications: schedule.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        schedule: { at: r.at, allowWhileIdle: true },
        extra: { personId: r.personId },
      })),
    })
  } catch (e) {
    console.error('Failed to schedule reminders', e)
  }
}
