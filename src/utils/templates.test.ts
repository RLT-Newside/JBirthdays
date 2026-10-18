import type { Person } from '../types'
import { DEFAULT_TEMPLATES, pickTemplate, renderTemplate } from './templates'

const person = (over: Partial<Person> = {}): Person => ({
  id: '1',
  name: 'Lena Müller',
  month: 10,
  day: 24,
  year: 1998,
  tagIds: [],
  createdAt: 0,
  updatedAt: 0,
  ...over,
})

const today = new Date(2026, 9, 18)

describe('renderTemplate', () => {
  it('fills first name and ordinal', () => {
    expect(renderTemplate('Happy {ordinal} birthday, {name}!', person(), today)).toBe('Happy 28th birthday, Lena!')
  })
  it('fills full name and age', () => {
    expect(renderTemplate('{fullname} turns {age}', person(), today)).toBe('Lena Müller turns 28')
  })
  it('collapses age placeholders when year unknown', () => {
    expect(renderTemplate('Happy {ordinal} birthday, {name}!', person({ year: undefined }), today)).toBe(
      'Happy birthday, Lena!',
    )
  })
})

describe('pickTemplate', () => {
  it('prefers the person template, then default, then first', () => {
    const [a, b, c] = DEFAULT_TEMPLATES
    expect(pickTemplate(person({ templateId: c.id }), DEFAULT_TEMPLATES, b.id)).toBe(c)
    expect(pickTemplate(person(), DEFAULT_TEMPLATES, b.id)).toBe(b)
    expect(pickTemplate(person({ templateId: 'gone' }), DEFAULT_TEMPLATES)).toBe(a)
  })
})
