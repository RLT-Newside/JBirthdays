import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppDataProvider } from '../../context/app-data'
import { ContactsProvider } from '../../context/contacts'
import type { Person } from '../../types'
import type { ContactSummary, ContactSyncApi } from '../../utils/contacts'
import { ContactsPrompt } from './contacts-prompt'

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }))

const contacts: ContactSummary[] = [
  { lookupKey: 'kl', contactId: '1', name: 'Lena', birthday: { month: 10, day: 24 }, writable: true },
  { lookupKey: 'km', contactId: '2', name: 'Max', writable: true },
  { lookupKey: 'kz', contactId: '3', name: 'Zoe', birthday: { month: 1, day: 1, year: 2000 }, writable: false },
]

function fakeApi(over: Partial<ContactSyncApi> = {}): ContactSyncApi {
  return {
    requestRead: vi.fn(async () => true),
    requestWrite: vi.fn(async () => true),
    list: vi.fn(async () => contacts),
    get: vi.fn(async () => ({ found: [], missing: [] })),
    setBirthday: vi.fn(async () => {}),
    ...over,
  }
}

function setup(api: ContactSyncApi | null) {
  const onResult = vi.fn()
  const view = render(
    <AppDataProvider>
      <ContactsProvider api={api}>
        <ContactsPrompt onResult={onResult} />
      </ContactsProvider>
    </AppDataProvider>,
  )
  return { onResult, ...view }
}

const stored = (): Person[] => JSON.parse(localStorage.getItem('bday_people') ?? '[]')
const prompt = () => screen.queryByRole('dialog', { name: 'Sync birthdays from contacts?' })

describe('ContactsPrompt', () => {
  it('adds and links only contacts with a birthday, then never asks again', async () => {
    const user = userEvent.setup()
    const api = fakeApi()
    const { onResult, unmount } = setup(api)
    await user.click(screen.getByRole('button', { name: 'Sync all' }))

    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Added 2 birthdays 🎉'))
    expect(stored().map((p) => p.name)).toEqual(['Lena', 'Zoe'])
    expect(stored()[0].contact?.lookupKey).toBe('kl')
    expect(stored()[1]).toMatchObject({ month: 1, day: 1, year: 2000, contact: { lookupKey: 'kz', readOnly: true } })
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(['kl', 'kz']))
    expect(prompt()).toBeNull()

    unmount()
    localStorage.removeItem('bday_people')
    setup(fakeApi())
    expect(prompt()).toBeNull()
  })

  it('stays gone after Cancel, without touching contacts', async () => {
    const user = userEvent.setup()
    const api = fakeApi()
    const { unmount } = setup(api)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(prompt()).toBeNull()
    expect(api.requestRead).not.toHaveBeenCalled()
    unmount()
    setup(fakeApi())
    expect(prompt()).toBeNull()
  })

  it('reports denied access and adds nobody', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ requestRead: vi.fn(async () => false) })
    const { onResult } = setup(api)
    await user.click(screen.getByRole('button', { name: 'Sync all' }))

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(expect.stringContaining('No access')))
    expect(api.list).not.toHaveBeenCalled()
    expect(stored()).toEqual([])
  })

  it('skips installs that already have people, even if they later delete everyone', () => {
    const lena: Person = { id: 'p1', name: 'Lena', month: 10, day: 24, tagIds: [], createdAt: 1, updatedAt: 1 }
    localStorage.setItem('bday_people', JSON.stringify([lena]))
    const { unmount } = setup(fakeApi())
    expect(prompt()).toBeNull()

    unmount()
    localStorage.removeItem('bday_people')
    setup(fakeApi())
    expect(prompt()).toBeNull()
  })

  it('never shows without the contacts plugin', () => {
    setup(null)
    expect(prompt()).toBeNull()
  })
})
