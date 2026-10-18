import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppDataProvider } from '../../../../context/app-data'
import { ContactsProvider } from '../../../../context/contacts'
import type { Person } from '../../../../types'
import type { ContactSyncApi } from '../../../../utils/contacts'
import { ContactsCard } from './contacts-card'

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }))

const b = { month: 3, day: 15 }
const linked: Person = {
  id: 'p1',
  name: 'Lena',
  ...b,
  tagIds: [],
  createdAt: 1,
  updatedAt: 1,
  contact: { lookupKey: 'k1', synced: b, syncedAt: 1 },
}

function api(): ContactSyncApi {
  return {
    requestRead: vi.fn(async () => true),
    requestWrite: vi.fn(async () => true),
    list: vi.fn(async () => []),
    get: vi.fn(async () => ({ found: [], missing: [] })),
    setBirthday: vi.fn(async () => {}),
  }
}

function renderCard(a: ContactSyncApi | null) {
  localStorage.setItem('bday_people', JSON.stringify([linked]))
  return render(
    <AppDataProvider>
      <ContactsProvider api={a}>
        <ContactsCard />
      </ContactsProvider>
    </AppDataProvider>,
  )
}

beforeEach(() => localStorage.clear())

describe('ContactsCard', () => {
  it('shows linked count and syncs on demand', async () => {
    const user = userEvent.setup()
    const a = api()
    renderCard(a)
    expect(screen.getByText('1 linked')).toBeInTheDocument()
    await waitFor(() => expect(a.get).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'Sync now' }))
    await waitFor(() => expect(a.get).toHaveBeenCalledTimes(2))
  })

  it('is hidden on the web', () => {
    const { container } = renderCard(null)
    expect(container).toBeEmptyDOMElement()
  })
})
