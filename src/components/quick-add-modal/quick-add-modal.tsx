// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { X } from 'lucide-react'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useAppData } from '../../context/app-data'
import { daysInMonth, monthName } from '../../utils/birthday'
import { type QuickRow, rowStatus, rowsToDrafts } from '../../utils/quickAdd'
import { Button } from '../button/button'
import { Modal } from '../modal/modal'
import { Select } from '../select/select'
import { TagChip } from '../tag-chip/tag-chip'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function newRow(): QuickRow {
  const now = new Date()
  return { key: uuid(), name: '', day: now.getDate(), month: now.getMonth() + 1, year: '' }
}

interface Props {
  onAdded: (count: number) => void
}

/** Sheet for typing many birthdays in a row (e.g. friends whose birthdays live in Snapchat). */
export function QuickAddModal({ onAdded }: Props) {
  const { quickAddOpen, setQuickAddOpen, people, tags, addPerson } = useAppData()
  const [rows, setRows] = useState<QuickRow[]>(() => [newRow()])
  const [tagIds, setTagIds] = useState<string[]>([])
  const nameRefs = useRef(new Map<string, HTMLInputElement>())
  const focusKey = useRef<string | null>(null)

  useEffect(() => {
    if (quickAddOpen) {
      setRows([newRow()])
      setTagIds([])
    }
  }, [quickAddOpen])

  useEffect(() => {
    if (!focusKey.current) return
    nameRefs.current.get(focusKey.current)?.focus()
    focusKey.current = null
  })

  const drafts = rowsToDrafts(rows, people, tagIds)
  const close = () => setQuickAddOpen(false)

  const patch = (key: string, p: Partial<QuickRow>) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r
        const next = { ...r, ...p }
        return { ...next, day: Math.min(next.day, daysInMonth(next.month)) }
      }),
    )

  const onEnter = (e: KeyboardEvent<HTMLInputElement>, row: QuickRow) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const isLast = rows[rows.length - 1]?.key === row.key
    if (!isLast || !row.name.trim()) return
    const r = newRow()
    focusKey.current = r.key
    setRows((prev) => [...prev, r])
  }

  const save = () => {
    for (const d of drafts) addPerson(d)
    close()
    onAdded(drafts.length)
  }

  return (
    <Modal open={quickAddOpen} onClose={close} title="Quick add">
      <div className="space-y-4">
        <p className="text-xs text-white/45">Type a name, set the date, press Enter for the next person.</p>

        <ul className="space-y-3">
          {rows.map((row, i) => {
            const status = rowStatus(row, people)
            return (
              <li key={row.key} className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    ref={(el) => {
                      if (el) nameRefs.current.set(row.key, el)
                      else nameRefs.current.delete(row.key)
                    }}
                    aria-label="Name"
                    className="field"
                    placeholder={i === 0 ? 'Name' : 'Next person'}
                    value={row.name}
                    onChange={(e) => patch(row.key, { name: e.target.value })}
                    onKeyDown={(e) => onEnter(e, row)}
                    enterKeyHint="next"
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove row"
                      onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                      className="p-2 text-white/30 hover:text-white/70 shrink-0"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-2">
                  <Select
                    aria-label="Day"
                    columns={7}
                    value={row.day}
                    onChange={(day) => patch(row.key, { day })}
                    options={Array.from({ length: daysInMonth(row.month) }, (_, d) => ({
                      value: d + 1,
                      label: String(d + 1),
                    }))}
                  />
                  <Select
                    aria-label="Month"
                    value={row.month}
                    onChange={(month) => patch(row.key, { month })}
                    options={MONTHS.map((m) => ({ value: m, label: monthName(m) }))}
                  />
                  <input
                    aria-label="Year"
                    aria-invalid={status === 'invalid' || undefined}
                    className="field"
                    inputMode="numeric"
                    placeholder="Year?"
                    maxLength={4}
                    value={row.year}
                    onChange={(e) => patch(row.key, { year: e.target.value.replace(/\D/g, '') })}
                    onKeyDown={(e) => onEnter(e, row)}
                  />
                </div>
                {status === 'duplicate' && <p className="text-[11px] text-brand/70 ml-1">Already saved</p>}
              </li>
            )
          })}
        </ul>

        {tags.length > 0 && (
          <div className="space-y-2">
            <span className="label-caption block">Tag everyone</span>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <TagChip
                  key={t.id}
                  tag={t}
                  active={tagIds.includes(t.id)}
                  onClick={() =>
                    setTagIds((prev) => (prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]))
                  }
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button disabled={drafts.length === 0} onClick={save}>
            {`Add ${drafts.length}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
