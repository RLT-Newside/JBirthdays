import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { AppDataProvider, useAppData } from '../../context/app-data'
import { ContactsProvider } from '../../context/contacts'
import type { Person } from '../../types'
import type { ContactSummary, ContactSyncApi } from '../../utils/contacts'
import { ContactPicker } from './contact-picker'

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }))

const contacts: ContactSummary[] = [
  { lookupKey: 'kl', contactId: '1', name: 'Lena Müller', birthday: { month: 10, day: 24 }, writable: true },
  { lookupKey: 'km', contactId: '2', name: 'Max Muster', writable: true },
  { lookupKey: 'kz', contactId: '3', name: 'Zoe', birthday: { month: 1, day: 1, year: 2000 }, writable: true },
]

const api: ContactSyncApi = {
  requestRead: vi.fn(async () => true),
  requestWrite: vi.fn(async () => true),
  list: vi.fn(async () => contacts),
  get: vi.fn(async () => ({ found: [], missing: [] })),
  setBirthday: vi.fn(async () => {}),
}

function Opener() {
  const { setContactPickerOpen } = useAppData()
  useEffect(() => setContactPickerOpen(true), [setContactPickerOpen])
  return null
}

const stored = (): Person[] => JSON.parse(localStorage.getItem('bday_people') ?? '[]')

beforeEach(() => {
  localStorage.clear()
  const lena: Person = { id: 'p1', name: 'lena muller', month: 10, day: 24, tagIds: [], createdAt: 1, updatedAt: 1 }
  localStorage.setItem('bday_people', JSON.stringify([lena]))
})

describe('ContactPicker', () => {
  it('links matches instead of duplicating and adds new people', async () => {
    const user = userEvent.setup()
    render(
      <AppDataProvider>
        <ContactsProvider api={api}>
          <Opener />
          <ContactPicker />
        </ContactsProvider>
      </AppDataProvider>,
    )
    const dialog = await screen.findByRole('dialog', { name: 'Choose contacts' })
    await within(dialog).findByText('Zoe')
    expect(within(dialog).queryByText('Max Muster')).toBeNull()
    expect(within(dialog).getByText('In JBirthdays')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'All' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Max Muster' }))
    expect(within(dialog).getByRole('button', { name: 'Save 1' })).toBeDisabled()
    await user.click(within(dialog).getByRole('combobox', { name: 'Day for Max Muster' }))
    await user.click(screen.getByRole('option', { name: '5' }))
    await user.click(within(dialog).getByRole('combobox', { name: 'Month for Max Muster' }))
    await user.click(screen.getByRole('option', { name: 'Mar' }))
    expect(within(dialog).getByRole('button', { name: 'Save 1' })).toBeEnabled()

    await user.click(within(dialog).getByRole('checkbox', { name: 'Lena Müller' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Zoe' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save 3' }))

    const people = stored()
    expect(people).toHaveLength(3)
    expect(people.find((p) => p.id === 'p1')?.contact?.lookupKey).toBe('kl')
    expect(people.find((p) => p.id === 'p1')?.name).toBe('lena muller')
    expect(people.find((p) => p.name === 'Zoe')).toMatchObject({ month: 1, day: 1, year: 2000 })
    expect(people.find((p) => p.name === 'Max Muster')).toMatchObject({ month: 3, day: 5 })
    expect(people.find((p) => p.name === 'Max Muster')?.contact?.lookupKey).toBe('km')
  })

  it('selects and clears all visible contacts', async () => {
    const user = userEvent.setup()
    render(
      <AppDataProvider>
        <ContactsProvider api={api}>
          <Opener />
          <ContactPicker />
        </ContactsProvider>
      </AppDataProvider>,
    )
    const dialog = await screen.findByRole('dialog', { name: 'Choose contacts' })
    await within(dialog).findByText('Zoe')

    await user.click(within(dialog).getByRole('button', { name: 'Select all' }))
    expect(within(dialog).getByRole('checkbox', { name: 'Lena Müller' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Zoe' })).toBeChecked()
    expect(within(dialog).getByRole('button', { name: 'Save 2' })).toBeEnabled()

    await user.click(within(dialog).getByRole('button', { name: 'Clear all' }))
    expect(within(dialog).getByRole('button', { name: 'Save 0' })).toBeInTheDocument()
  })
})
