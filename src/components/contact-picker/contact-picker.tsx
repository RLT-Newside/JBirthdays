// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../../context/app-data'
import { buildContactLink, useContacts } from '../../context/contacts'
import type { Birthday, Person } from '../../types'
import { daysInMonth, formatBirthday, monthName } from '../../utils/birthday'
import { findPersonMatch, normalizeName } from '../../utils/contactMatch'
import { sameBirthday } from '../../utils/contactSync'
import type { ContactSummary } from '../../utils/contacts'
import { Button } from '../button/button'
import { Modal } from '../modal/modal'
import { Select } from '../select/select'

type Load = 'loading' | 'denied' | 'error' | 'ready'
type Filter = 'birthday' | 'all'
/** Date typed for a contact without a birthday; 0 = not chosen yet. */
interface Typed {
  day: number
  month: number
  year: string
}
/** Which birthday to keep when a matched person and the contact disagree. */
type Keep = 'app' | 'contact'

const MONTH_OPTIONS = [
  { value: 0, label: 'Month' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthName(i + 1) })),
]

function typedBirthday(t?: Typed): Birthday | null {
  if (!t?.day || !t.month || t.day > daysInMonth(t.month)) return null
  const y = t.year.trim()
  if (y && !(/^\d{4}$/.test(y) && +y >= 1900 && +y <= 2100)) return null
  return { month: t.month, day: t.day, ...(y && { year: +y }) }
}

/**
 * Choose which phone contacts to link. Multi mode (from People/Settings) creates or
 * links people; single mode (`linkingPersonId`) links one existing person.
 */
export function ContactPicker() {
  const { people, addPerson, contactPickerOpen, setContactPickerOpen, linkingPersonId, setLinkingPersonId } =
    useAppData()
  const { api, link, syncNow } = useContacts()
  const single = linkingPersonId ? people.find((p) => p.id === linkingPersonId) : undefined
  const open = contactPickerOpen || !!single

  const [load, setLoad] = useState<Load>('loading')
  const [contacts, setContacts] = useState<ContactSummary[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('birthday')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [typed, setTyped] = useState<Record<string, Typed>>({})
  const [keep, setKeep] = useState<Record<string, Keep>>({})

  const linkedTo = useMemo(() => {
    const m = new Map<string, Person>()
    for (const p of people) if (p.contact) m.set(p.contact.lookupKey, p)
    return m
  }, [people])

  // Reload only when the sheet opens. Already-linked contacts are hidden; unlink via the person or Settings.
  useEffect(() => {
    if (!open || !api) return
    setLoad('loading')
    setQuery('')
    setFilter(single ? 'all' : 'birthday')
    setTyped({})
    setKeep({})
    setSelected(new Set())
    let cancelled = false
    ;(async () => {
      try {
        if (!(await api.requestRead())) return !cancelled && setLoad('denied')
        const list = await api.list()
        if (cancelled) return
        setContacts(list)
        setLoad('ready')
      } catch {
        if (!cancelled) setLoad('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, api])

  const close = () => {
    setContactPickerOpen(false)
    setLinkingPersonId(null)
  }

  const matchFor = (c: ContactSummary): Person | undefined => single ?? findPersonMatch(c, people)

  const q = normalizeName(query)
  const visible = contacts.filter(
    (c) =>
      (filter === 'all' || c.birthday || selected.has(c.lookupKey)) &&
      (!q || normalizeName(c.name).includes(q)) &&
      !linkedTo.has(c.lookupKey),
  )

  // What saving would do for one ticked contact, or null when it still needs input.
  const plan = (c: ContactSummary): { person?: Person; birthday: Birthday } | null => {
    const person = matchFor(c)
    if (person) {
      if (!c.birthday || sameBirthday(person, c.birthday)) return { person, birthday: person }
      const k = keep[c.lookupKey]
      if (!k) return null
      return { person, birthday: k === 'app' ? person : c.birthday }
    }
    const b = c.birthday ?? typedBirthday(typed[c.lookupKey])
    return b ? { birthday: b } : null
  }

  const ticked = contacts.filter((c) => selected.has(c.lookupKey))
  const ready = ticked.every((c) => plan(c))

  const toggle = (c: ContactSummary) =>
    setSelected((prev) => {
      const next = new Set(single ? [] : prev)
      if (prev.has(c.lookupKey)) next.delete(c.lookupKey)
      else next.add(c.lookupKey)
      return next
    })

  const allVisibleOn = visible.length > 0 && visible.every((c) => selected.has(c.lookupKey))
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const c of visible) {
        if (allVisibleOn) next.delete(c.lookupKey)
        else next.add(c.lookupKey)
      }
      return next
    })

  const save = () => {
    for (const c of ticked) {
      const p = plan(c)
      if (!p) continue
      if (p.person) link(p.person.id, c, p.birthday)
      else
        addPerson({
          name: c.name,
          month: p.birthday.month,
          day: p.birthday.day,
          ...(p.birthday.year !== undefined && { year: p.birthday.year }),
          tagIds: [],
          contact: buildContactLink(c, p.birthday),
        })
    }
    syncNow()
    close()
  }

  const title = single ? 'Link to contact' : 'Choose contacts'

  return (
    <Modal open={open} onClose={close} title={title}>
      <div className="space-y-4">
        {single && (
          <p className="text-xs text-white/50">
            Pick the contact for <span className="text-white/80">{single.name}</span>. Names stay as they are; only the
            birthday syncs.
          </p>
        )}

        {load === 'loading' && <p className="text-sm text-white/50">Loading contacts…</p>}
        {load === 'denied' && (
          <p className="text-sm text-white/60">
            JBirthdays needs access to your contacts. Allow it in Android Settings → Apps → JBirthdays → Permissions.
          </p>
        )}
        {load === 'error' && <p className="text-sm text-red-400/80">Couldn't read your contacts. Try again later.</p>}

        {load === 'ready' && (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                aria-label="Search contacts"
                className="field pl-9"
                placeholder="Search contacts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {(
                [
                  ['birthday', 'Has birthday'],
                  ['all', 'All'],
                ] as const
              ).map(([f, label]) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    filter === f ? 'border-brand/60 text-brand bg-brand/10' : 'border-white/[0.08] text-white/60'
                  }`}
                >
                  {label}
                </button>
              ))}
              {!single && visible.length > 0 && (
                <button type="button" onClick={toggleAll} className="ml-auto px-3 py-1 text-xs text-brand">
                  {allVisibleOn ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>

            {visible.length === 0 && <p className="text-sm text-white/40">No contacts here.</p>}
            <ul className="space-y-1">
              {visible.map((c) => {
                const isOn = selected.has(c.lookupKey)
                const match = !single ? findPersonMatch(c, people) : undefined
                const person = matchFor(c)
                const conflict = isOn && person && c.birthday && !sameBirthday(person, c.birthday)
                const t = typed[c.lookupKey] ?? { day: 0, month: 0, year: '' }
                return (
                  <li key={c.lookupKey} className="rounded-xl px-2 py-1.5 hover:bg-white/[0.03]">
                    <label className="flex items-center gap-3">
                      <input
                        type={single ? 'radio' : 'checkbox'}
                        name={single ? 'contact' : undefined}
                        aria-label={c.name}
                        className="check"
                        checked={isOn}
                        onChange={() => toggle(c)}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm truncate">{c.name}</span>
                        <span className="block text-[11px] text-white/40">
                          {c.birthday ? formatBirthday(c.birthday) : 'No birthday'}
                          {!c.writable && ' · read-only'}
                        </span>
                      </span>
                      {match && <span className="text-[10px] text-white/50 shrink-0">In JBirthdays</span>}
                    </label>

                    {isOn && !person && !c.birthday && (
                      <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-2 mt-2 pl-8">
                        <Select
                          aria-label={`Day for ${c.name}`}
                          columns={7}
                          value={t.day}
                          onChange={(day) => setTyped((prev) => ({ ...prev, [c.lookupKey]: { ...t, day } }))}
                          options={[
                            { value: 0, label: 'Day' },
                            ...Array.from({ length: t.month ? daysInMonth(t.month) : 31 }, (_, i) => ({
                              value: i + 1,
                              label: String(i + 1),
                            })),
                          ]}
                        />
                        <Select
                          aria-label={`Month for ${c.name}`}
                          value={t.month}
                          onChange={(month) => setTyped((prev) => ({ ...prev, [c.lookupKey]: { ...t, month } }))}
                          options={MONTH_OPTIONS}
                        />
                        <input
                          aria-label={`Year for ${c.name}`}
                          className="field"
                          inputMode="numeric"
                          placeholder="Year?"
                          maxLength={4}
                          value={t.year}
                          onChange={(e) =>
                            setTyped((prev) => ({
                              ...prev,
                              [c.lookupKey]: { ...t, year: e.target.value.replace(/\D/g, '') },
                            }))
                          }
                        />
                      </div>
                    )}

                    {conflict && person && c.birthday && (
                      <div className="flex flex-wrap items-center gap-2 mt-2 pl-8 text-[11px]">
                        <span className="text-white/50">Different birthdays:</span>
                        {(
                          [
                            ['app', `Keep ${formatBirthday(person)}`],
                            ['contact', `Use ${formatBirthday(c.birthday)}`],
                          ] as const
                        ).map(([k, label]) => (
                          <button
                            key={k}
                            type="button"
                            aria-pressed={keep[c.lookupKey] === k}
                            onClick={() => setKeep((prev) => ({ ...prev, [c.lookupKey]: k }))}
                            className={`px-2.5 py-1 rounded-full border ${
                              keep[c.lookupKey] === k
                                ? 'border-brand/60 text-brand bg-brand/10'
                                : 'border-white/[0.1] text-white/60'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button disabled={load !== 'ready' || !ready || (single ? ticked.length !== 1 : false)} onClick={save}>
            {single ? 'Link' : `Save ${ticked.length}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
