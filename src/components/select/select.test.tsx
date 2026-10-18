import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { Select } from './select'

const OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
]

function Harness({ onChange = () => {} }: { onChange?: (v: number) => void }) {
  const [value, setValue] = useState(2)
  return (
    <Select
      aria-label="Month"
      value={value}
      options={OPTIONS}
      onChange={(v) => {
        setValue(v)
        onChange(v)
      }}
    />
  )
}

describe('Select', () => {
  it('shows the current label and opens a listbox with the value selected', () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox', { name: 'Month' })
    expect(trigger).toHaveTextContent('February')
    expect(screen.queryByRole('listbox')).toBeNull()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('option', { name: 'February' })).toHaveAttribute('aria-selected', 'true')
  })

  it('picks an option by click and closes', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: 'March' }))
    expect(onChange).toHaveBeenCalledWith(3)
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('combobox')).toHaveTextContent('March')
  })

  it('supports keyboard: arrows, typeahead, Enter and Escape', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const trigger = screen.getByRole('combobox')

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith(3)

    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.keyDown(trigger, { key: 'j' })
    fireEvent.keyDown(trigger, { key: ' ' })
    expect(onChange).toHaveBeenLastCalledWith(1)

    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('closes on a press outside', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
