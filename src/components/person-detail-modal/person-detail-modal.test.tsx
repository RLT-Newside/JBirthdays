import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { AppDataProvider, useAppData } from '../../context/app-data'
import { ContactsProvider } from '../../context/contacts'
import type { Person } from '../../types'
import type { ContactDetails, ContactSyncApi } from '../../utils/contacts'
import type { ContactPhone } from '../../utils/whatsapp'
import { PersonDetailModal } from './person-detail-modal'

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }))
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }))

const birthday = { month: 3, day: 15, year: 1990 }
const lena: Person = {
  id: 'p1',
  name: 'Lena',
  ...birthday,
  tagIds: [],
  createdAt: 1,
  updatedAt: 1,
  birthdayChangedAt: 1,
  contact: { lookupKey: 'k1', synced: birthday, syncedAt: 1 },
}

function apiWith(phones: ContactPhone[]): ContactSyncApi {
  const found: ContactDetails = {
    requestedKey: 'k1',
    lookupKey: 'k1',
    contactId: '1',
    name: 'Lena Müller',
    birthday,
    writable: true,
    phones,
    emails: ['lena@example.com'],
    addresses: [],
    lastUpdated: 1,
  }
  return {
    requestRead: vi.fn(async () => true),
    requestWrite: vi.fn(async () => true),
    list: vi.fn(async () => []),
    get: vi.fn(async () => ({ found: [found], missing: [] })),
    setBirthday: vi.fn(async () => {}),
  }
}

function Opener() {
  const { setViewingId } = useAppData()
  useEffect(() => setViewingId('p1'), [setViewingId])
  return null
}

function renderDetail(person: Person, api: ContactSyncApi | null) {
  localStorage.setItem('bday_people', JSON.stringify([person]))
  render(
    <AppDataProvider>
      <ContactsProvider api={api}>
        <Opener />
        <PersonDetailModal />
      </ContactsProvider>
    </AppDataProvider>,
  )
}

let openSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  localStorage.clear()
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
})
afterEach(() => openSpy.mockRestore())

describe('PersonDetailModal with a linked contact', () => {
  it('opens the WhatsApp chat with the greeting', async () => {
    const user = userEvent.setup()
    renderDetail(lena, apiWith([{ number: '079', normalized: '+41791234567', type: 'mobile' }]))
    const dialog = await screen.findByRole('dialog', { name: 'Lena' })
    expect(await within(dialog).findByText('lena@example.com')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /send on whatsapp/i }))
    expect(openSpy).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/41791234567\?text=/), '_system')
  })

  it('asks which number to use when there are several', async () => {
    const user = userEvent.setup()
    renderDetail(
      lena,
      apiWith([
        { number: '079', normalized: '+41791234567', type: 'mobile' },
        { number: '078', normalized: '+41781111111', type: 'mobile' },
      ]),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Lena' })
    await user.click(await within(dialog).findByRole('button', { name: /send on whatsapp/i }))
    expect(openSpy).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: '+41781111111' }))
    expect(openSpy).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/41781111111\?text=/), '_system')
  })
})

describe('PersonDetailModal on the web', () => {
  it('shows no contact features', async () => {
    renderDetail({ ...lena, contact: undefined }, null)
    const dialog = await screen.findByRole('dialog', { name: 'Lena' })
    expect(within(dialog).queryByRole('button', { name: /whatsapp/i })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: /link to contact/i })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Send greeting' })).toBeInTheDocument()
  })
})
