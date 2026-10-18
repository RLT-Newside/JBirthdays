import { act, render, waitFor } from '@testing-library/react'
import type { Birthday, Person } from '../types'
import type { ContactDetails, ContactSyncApi } from '../utils/contacts'
import { AppDataProvider } from './app-data'
import { ContactsProvider, useContacts } from './contacts'

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }))

const base: Birthday = { month: 3, day: 15, year: 1990 }

function linkedPerson(over: Partial<Person> = {}): Person {
  return {
    id: 'p1',
    name: 'Lena',
    ...base,
    tagIds: [],
    createdAt: 1,
    updatedAt: 10,
    birthdayChangedAt: 10,
    contact: { lookupKey: 'k1', synced: base, syncedAt: 10 },
    ...over,
  }
}

function details(over: Partial<ContactDetails> = {}): ContactDetails {
  return {
    requestedKey: 'k1',
    lookupKey: 'k1',
    contactId: '7',
    name: 'Lena Müller',
    birthday: base,
    writable: true,
    phones: [{ number: '079', normalized: '+41790000000', type: 'mobile' }],
    emails: ['lena@example.com'],
    addresses: [],
    lastUpdated: 20,
    ...over,
  }
}

function fakeApi(
  found: ContactDetails[],
  missing: string[] = [],
): ContactSyncApi & { setBirthday: ReturnType<typeof vi.fn> } {
  return {
    requestRead: vi.fn(async () => true),
    requestWrite: vi.fn(async () => true),
    list: vi.fn(async () => []),
    get: vi.fn(async () => ({ found, missing })),
    setBirthday: vi.fn(async () => {}),
  }
}

let ctx: ReturnType<typeof useContacts>
function Probe() {
  ctx = useContacts()
  return null
}

function renderWith(people: Person[], api: ContactSyncApi) {
  localStorage.setItem('bday_people', JSON.stringify(people))
  return render(
    <AppDataProvider>
      <ContactsProvider api={api}>
        <Probe />
      </ContactsProvider>
    </AppDataProvider>,
  )
}

const stored = (): Person[] => JSON.parse(localStorage.getItem('bday_people') ?? '[]')

beforeEach(() => localStorage.clear())

describe('ContactsProvider sync', () => {
  it('pulls a birthday changed in the contact', async () => {
    const changed = { month: 4, day: 2, year: 1990 }
    renderWith([linkedPerson()], fakeApi([details({ birthday: changed })]))
    await waitFor(() => expect(stored()[0]).toMatchObject({ month: 4, day: 2 }))
    expect(stored()[0].contact?.synced).toEqual(changed)
    expect(ctx.lastResult?.pulled).toBe(1)
  })

  it('pushes a birthday changed in the app', async () => {
    const api = fakeApi([details()])
    renderWith([linkedPerson({ month: 5, day: 9, birthdayChangedAt: 30 })], api)
    await waitFor(() => expect(api.setBirthday).toHaveBeenCalledWith('k1', { month: 5, day: 9, year: 1990 }))
    await waitFor(() => expect(stored()[0].contact?.synced).toEqual({ month: 5, day: 9, year: 1990 }))
  })

  it('keeps the old base when a write fails, so the next sync retries', async () => {
    const api = fakeApi([details()])
    api.setBirthday.mockRejectedValue(new Error('NOT_WRITABLE'))
    renderWith([linkedPerson({ month: 5, day: 9, birthdayChangedAt: 30 })], api)
    await waitFor(() => expect(ctx.lastResult?.failed).toBe(1))
    expect(stored()[0].contact?.synced).toEqual(base)
    expect(stored()[0]).toMatchObject({ month: 5, day: 9 })
  })

  it('unlinks people whose contact was deleted, keeping the person', async () => {
    renderWith([linkedPerson()], fakeApi([], ['k1']))
    await waitFor(() => expect(ctx.lastResult?.unlinked).toEqual(['Lena']))
    expect(stored()[0].contact).toBeUndefined()
    expect(stored()[0].name).toBe('Lena')
  })

  it('keeps contact details in memory only, never in storage', async () => {
    renderWith([linkedPerson()], fakeApi([details()]))
    await waitFor(() => expect(ctx.cache.k1?.emails).toEqual(['lena@example.com']))
    const all = Object.keys(localStorage)
      .map((k) => localStorage.getItem(k))
      .join(' ')
    expect(all).not.toContain('lena@example.com')
    expect(all).not.toContain('41790000000')
  })

  it('remembers the WhatsApp choice without storing the number', async () => {
    renderWith([linkedPerson()], fakeApi([details()]))
    await waitFor(() => expect(ctx.cache.k1).toBeDefined())
    act(() => ctx.setWaNumber('k1', '+41790000000'))
    await waitFor(() => expect(ctx.cache.k1.waNumber).toBe('+41790000000'))
    const all = Object.keys(localStorage)
      .map((k) => localStorage.getItem(k))
      .join(' ')
    expect(all).not.toContain('41790000000')
  })

  it('takes a year removal from the contact instead of writing the year back', async () => {
    const api = fakeApi([details({ birthday: { month: 3, day: 15 }, lastUpdated: 50 })])
    renderWith([linkedPerson()], api)
    await waitFor(() => expect(stored()[0].contact?.synced).toEqual({ month: 3, day: 15 }))
    expect(stored()[0].year).toBeUndefined()
    act(() => ctx.syncNow())
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(ctx.syncing).toBe(false))
    expect(api.setBirthday).not.toHaveBeenCalled()
  })

  it('never overwrites a contact birthday it cannot read', async () => {
    const api = fakeApi([details({ birthday: undefined, birthdayUnreadable: true })])
    renderWith([linkedPerson()], api)
    await waitFor(() => expect(ctx.lastResult).not.toBeNull())
    expect(api.setBirthday).not.toHaveBeenCalled()
  })

  it('does not re-link a person unlinked while a sync was running', async () => {
    let release!: (v: { found: ContactDetails[]; missing: string[] }) => void
    const api = fakeApi([])
    api.get = vi.fn(() => new Promise<{ found: ContactDetails[]; missing: string[] }>((r) => (release = r)))
    renderWith([linkedPerson()], api)
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    act(() => ctx.unlink('p1'))
    await act(async () => release({ found: [details({ birthday: { month: 4, day: 2, year: 1990 } })], missing: [] }))
    await waitFor(() => expect(ctx.syncing).toBe(false))
    expect(stored()[0].contact).toBeUndefined()
    expect(stored()[0]).toMatchObject({ month: 3, day: 15 })
  })

  it('runs a sync requested while another was running', async () => {
    let release!: (v: { found: ContactDetails[]; missing: string[] }) => void
    const api = fakeApi([details()])
    const first = new Promise<{ found: ContactDetails[]; missing: string[] }>((r) => (release = r))
    api.get = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockResolvedValue({ found: [details()], missing: [] })
    renderWith([linkedPerson()], api)
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1))
    act(() => ctx.syncNow())
    await act(async () => release({ found: [details()], missing: [] }))
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
  })

  it('links a person and writes the chosen birthday on the next sync', async () => {
    const api = fakeApi([details({ birthday: undefined })])
    renderWith([{ ...linkedPerson(), contact: undefined }], api)
    await act(async () => {
      ctx.link('p1', { lookupKey: 'k1', contactId: '7', name: 'Lena Müller', writable: true })
    })
    await waitFor(() => expect(api.setBirthday).toHaveBeenCalledWith('k1', base))
    expect(stored()[0].name).toBe('Lena')
  })
})
