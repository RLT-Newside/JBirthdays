// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { Person } from '../types'

type BirthDate = Pick<Person, 'month' | 'day' | 'year'>

const DAY_MS = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** The birthday's date in a given year. Feb 29 falls back to Feb 28 in non-leap years. */
export function occurrenceInYear(b: BirthDate, year: number): Date {
  const day = b.month === 2 && b.day === 29 && !isLeapYear(year) ? 28 : b.day
  return new Date(year, b.month - 1, day)
}

/** Next birthday on or after today (today itself counts). */
export function nextOccurrence(b: BirthDate, today: Date): Date {
  const t = startOfDay(today)
  const thisYear = occurrenceInYear(b, t.getFullYear())
  return thisYear >= t ? thisYear : occurrenceInYear(b, t.getFullYear() + 1)
}

export function daysUntil(b: BirthDate, today: Date): number {
  // Round, not floor: a DST shift makes some days 23h or 25h long.
  return Math.round((nextOccurrence(b, today).getTime() - startOfDay(today).getTime()) / DAY_MS)
}

/** Age the person turns on their next birthday; undefined when the year is unknown. */
export function turningAge(b: BirthDate, today: Date): number | undefined {
  if (b.year === undefined) return undefined
  return nextOccurrence(b, today).getFullYear() - b.year
}

export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

export function isMilestone(age: number | undefined): boolean {
  if (age === undefined) return false
  return age === 18 || age === 21 || (age >= 10 && age % 10 === 0)
}

export interface Upcoming {
  person: Person
  days: number
  date: Date
  age?: number
}

export function sortUpcoming(people: Person[], today: Date): Upcoming[] {
  return people
    .map((person) => ({
      person,
      days: daysUntil(person, today),
      date: nextOccurrence(person, today),
      age: turningAge(person, today),
    }))
    .sort((a, b) => a.days - b.days || a.person.name.localeCompare(b.person.name))
}

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? ''
}

export function formatBirthday(b: BirthDate): string {
  const base = `${b.day} ${monthName(b.month)}`
  return b.year === undefined ? base : `${base} ${b.year}`
}

/** Max day for a month; uses a leap year so Feb allows 29. */
export function daysInMonth(month: number): number {
  return new Date(2024, month, 0).getDate()
}

export function countdownLabel(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `in ${days} days`
}
