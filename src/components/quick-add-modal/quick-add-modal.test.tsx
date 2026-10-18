import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }))
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }))
vi.mock('@capacitor/filesystem', () => ({ Filesystem: {}, Directory: {}, Encoding: {} }))

beforeEach(() => localStorage.clear())

describe('Quick add', () => {
  it('adds a new row on Enter and saves all valid rows', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /add several at once/i }))
    const dialog = screen.getByRole('dialog', { name: 'Quick add' })

    await user.type(within(dialog).getAllByLabelText('Name')[0], 'Anna{Enter}')
    const names = within(dialog).getAllByLabelText('Name')
    expect(names).toHaveLength(2)
    expect(names[1]).toHaveFocus()
    await user.type(names[1], 'Ben')

    await user.click(within(dialog).getByRole('button', { name: 'Add 2' }))
    expect(screen.queryByRole('dialog', { name: 'Quick add' })).toBeNull()
    expect(await screen.findByText('Anna')).toBeInTheDocument()
    expect(screen.getByText('Ben')).toBeInTheDocument()
  })
})
