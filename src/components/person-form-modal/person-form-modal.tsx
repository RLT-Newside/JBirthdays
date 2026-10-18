// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Plus } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useAppData } from '../../context/app-data'
import type { PersonDraft } from '../../types'
import { daysInMonth, monthName } from '../../utils/birthday'
import { TAG_COLORS } from '../../utils/importMerge'
import { Button } from '../button/button'
import { FormField } from '../form-field/form-field'
import { Modal } from '../modal/modal'
import { Select } from '../select/select'
import { TagChip } from '../tag-chip/tag-chip'

export const REMINDER_OPTIONS = [0, 1, 3, 7, 14, 30]

export function reminderLabel(d: number): string {
  if (d === 0) return 'On the day'
  if (d === 1) return '1 day before'
  if (d === 7) return '1 week before'
  if (d === 14) return '2 weeks before'
  if (d === 30) return '1 month before'
  return `${d} days before`
}

interface FormState {
  name: string
  month: number
  day: number
  year: string
  tagIds: string[]
  notes: string
  customReminders: boolean
  reminderDays: number[]
  templateId: string
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function PersonFormModal() {
  const { editingId, setEditingId, people, tags, templates, settings, addPerson, updatePerson, addTag, setViewingId } =
    useAppData()
  const editing = editingId && editingId !== 'new' ? people.find((p) => p.id === editingId) : undefined
  const open = editingId !== null

  const blank = (): FormState => ({
    name: '',
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    year: '',
    tagIds: [],
    notes: '',
    customReminders: false,
    reminderDays: settings.defaultReminderDays,
    templateId: '',
  })

  const [form, setForm] = useState<FormState>(blank)
  const [newTag, setNewTag] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setError(undefined)
    setNewTag('')
    if (editing) {
      setForm({
        name: editing.name,
        month: editing.month,
        day: editing.day,
        year: editing.year?.toString() ?? '',
        tagIds: editing.tagIds,
        notes: editing.notes ?? '',
        customReminders: editing.reminderDays !== undefined,
        reminderDays: editing.reminderDays ?? settings.defaultReminderDays,
        templateId: editing.templateId ?? '',
      })
    } else {
      setForm(blank())
    }
  }, [open, editingId])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const maxDay = daysInMonth(form.month)
  const thisYear = new Date().getFullYear()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('Name is required')
    const year = form.year.trim() ? Number(form.year) : undefined
    if (year !== undefined && (!Number.isInteger(year) || year < 1900 || year > thisYear)) {
      return setError(`Year must be between 1900 and ${thisYear}`)
    }
    const draft: PersonDraft = {
      name,
      month: form.month,
      day: Math.min(form.day, maxDay),
      year,
      tagIds: form.tagIds,
      notes: form.notes.trim() || undefined,
      reminderDays: form.customReminders ? [...form.reminderDays].sort((a, b) => b - a) : undefined,
      templateId: form.templateId || undefined,
    }
    if (editing) {
      updatePerson(editing.id, draft)
      setEditingId(null)
    } else {
      const created = addPerson(draft)
      setEditingId(null)
      setViewingId(created.id)
    }
  }

  const createTag = () => {
    const name = newTag.trim()
    if (!name) return
    const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase())
    const tag = existing ?? addTag(name, TAG_COLORS[tags.length % TAG_COLORS.length])
    if (!form.tagIds.includes(tag.id)) set('tagIds', [...form.tagIds, tag.id])
    setNewTag('')
  }

  const toggle = (list: number[], v: number) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  return (
    <Modal open={open} onClose={() => setEditingId(null)} title={editing ? 'Edit birthday' : 'Add birthday'}>
      <form onSubmit={submit} className="space-y-4">
        <FormField
          label="Name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Lena Müller"
          maxLength={100}
          autoFocus={!editing}
          error={error === 'Name is required' ? error : undefined}
        />

        <div>
          <span className="label-caption block mb-1">Birthday</span>
          <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-2">
            <Select
              aria-label="Day"
              columns={7}
              value={Math.min(form.day, maxDay)}
              onChange={(d) => set('day', d)}
              options={Array.from({ length: maxDay }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
            />
            <Select
              aria-label="Month"
              value={form.month}
              onChange={(m) => set('month', m)}
              options={MONTHS.map((m) => ({ value: m, label: monthName(m) }))}
            />
            <input
              aria-label="Year (optional)"
              className="field"
              inputMode="numeric"
              placeholder="Year?"
              maxLength={4}
              value={form.year}
              onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))}
            />
          </div>
          {error && error !== 'Name is required' && <p className="text-xs text-red-400 mt-1">{error}</p>}
          <p className="text-[11px] text-white/35 mt-1">Year is optional — without it the age is hidden.</p>
        </div>

        <div>
          <span className="label-caption block mb-2">Tags</span>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <TagChip
                key={t.id}
                tag={t}
                active={form.tagIds.includes(t.id)}
                onClick={() =>
                  set(
                    'tagIds',
                    form.tagIds.includes(t.id) ? form.tagIds.filter((x) => x !== t.id) : [...form.tagIds, t.id],
                  )
                }
              />
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              aria-label="New tag"
              className="field"
              placeholder="New tag (e.g. Family)"
              maxLength={40}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  createTag()
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={createTag}
              aria-label="Add tag"
              disabled={!newTag.trim()}
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>

        <FormField
          label="Notes"
          multiline
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Likes jazz, allergic to nuts…"
          maxLength={2000}
        />

        <div>
          <label className="flex items-center justify-between">
            <span className="label-caption">Custom reminders</span>
            <input
              type="checkbox"
              checked={form.customReminders}
              onChange={(e) => set('customReminders', e.target.checked)}
              className="switch"
            />
          </label>
          {form.customReminders ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {REMINDER_OPTIONS.map((d) => {
                const on = form.reminderDays.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('reminderDays', toggle(form.reminderDays, d))}
                    className={`text-xs px-3 py-1 rounded-full border press-scale ${
                      on ? 'border-brand bg-brand/15 text-brand' : 'border-white/[0.08] text-white/55'
                    }`}
                  >
                    {reminderLabel(d)}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-[11px] text-white/35 mt-1">
              Using default: {settings.defaultReminderDays.map(reminderLabel).join(', ') || 'none'}
            </p>
          )}
        </div>

        <div>
          <label className="label-caption block mb-1" htmlFor="tpl-select">
            Greeting template
          </label>
          <Select
            id="tpl-select"
            value={form.templateId}
            onChange={(id) => set('templateId', id)}
            options={[{ value: '', label: 'Default' }, ...templates.map((t) => ({ value: t.id, label: t.name }))]}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
            Cancel
          </Button>
          <Button type="submit">{editing ? 'Save' : 'Add'}</Button>
        </div>
      </form>
    </Modal>
  )
}
