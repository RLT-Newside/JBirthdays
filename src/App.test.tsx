import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { buildShareLink } from './utils/share'

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }))
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }))
vi.mock('@capacitor/filesystem', () => ({ Filesystem: {}, Directory: {}, Encoding: {} }))

describe('App', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('adds a birthday and shows it in upcoming with a greeting', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText('No birthdays yet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add first birthday/i }))
    const form = screen.getByRole('dialog', { name: 'Add birthday' })
    await user.type(within(form).getByLabelText('Name'), 'Lena Müller')
    await user.type(within(form).getByLabelText('Year (optional)'), '1998')
    await user.click(within(form).getByRole('button', { name: 'Add' }))

    // Detail sheet opens with a pre-filled greeting.
    const detail = screen.getByRole('dialog', { name: 'Lena Müller' })
    expect((within(detail).getByLabelText('Message') as HTMLTextAreaElement).value).toMatch(/birthday, Lena!/)

    await user.type(within(detail).getByLabelText('New gift idea'), 'Vinyl{Enter}')
    expect(within(detail).getByText('Vinyl')).toBeInTheDocument()
    await user.click(within(detail).getByLabelText('Close'))

    expect(screen.getByText('Lena Müller')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('bday_people')!)).toHaveLength(1)
  })

  it('offers an import when opened from a share link', async () => {
    const user = userEvent.setup()
    const link = await buildShareLink(
      {
        app: 'jbirthdays',
        version: 1,
        from: 'Sam',
        people: [{ id: 'x', name: 'Max', month: 3, day: 1, tags: ['Squad'] }],
      },
      'http://localhost:3000/',
    )
    window.history.replaceState(null, '', link.slice(link.indexOf('#')))
    render(<App />)

    const dialog = await screen.findByRole('dialog', { name: 'Import birthdays' })
    expect(within(dialog).getByText('Sam')).toBeInTheDocument()
    expect(window.location.hash).toBe('')
    await user.click(within(dialog).getByRole('button', { name: 'Import 1' }))

    expect(await screen.findByText('Max')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('bday_tags')!)[0].name).toBe('Squad')
  })
})
