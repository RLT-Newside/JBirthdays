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

  it('caches contact details on the device only', async () => {
    renderWith([linkedPerson()], fakeApi([details()]))
    await waitFor(() => expect(ctx.cache.k1?.emails).toEqual(['lena@example.com']))
    expect(JSON.parse(localStorage.getItem('bday_contact_cache') ?? '{}').k1.phones).toHaveLength(1)
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
