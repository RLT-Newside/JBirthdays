import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { AppDataProvider, useAppData } from '../../context/app-data'
import type { Person } from '../../types'
import { QuickAddModal } from './quick-add-modal'

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }))

function Opener() {
  const { setQuickAddOpen } = useAppData()
  useEffect(() => setQuickAddOpen(true), [setQuickAddOpen])
  return null
}

const stored = (): Person[] => JSON.parse(localStorage.getItem('bday_people') ?? '[]')

beforeEach(() => localStorage.clear())

describe('Quick add', () => {
  it('adds a new row on Enter and saves all valid rows', async () => {
    const user = userEvent.setup({ delay: null })
    const onAdded = vi.fn()
    render(
      <AppDataProvider>
        <Opener />
        <QuickAddModal onAdded={onAdded} />
      </AppDataProvider>,
    )
    const dialog = await screen.findByRole('dialog', { name: 'Quick add' })

    await user.type(within(dialog).getAllByLabelText('Name')[0], 'Anna{Enter}')
    const names = within(dialog).getAllByLabelText('Name')
    expect(names).toHaveLength(2)
    expect(names[1]).toHaveFocus()
    await user.type(names[1], 'Ben')

    await user.click(within(dialog).getByRole('button', { name: 'Add 2' }))
    expect(screen.queryByRole('dialog', { name: 'Quick add' })).toBeNull()
    expect(onAdded).toHaveBeenCalledWith(2)
    expect(stored().map((p) => p.name)).toEqual(['Anna', 'Ben'])
  })
})
