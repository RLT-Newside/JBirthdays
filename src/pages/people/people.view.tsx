// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { ListPlus, Search, Users } from 'lucide-react'
import { Fab } from '../../components/fab/fab'
import { PersonRow } from '../../components/person-row/person-row'
import { TagChip } from '../../components/tag-chip/tag-chip'
import type { Person, Tag } from '../../types'
import { monthName } from '../../utils/birthday'

export type SortMode = 'calendar' | 'name'

export interface PeopleRow {
  person: Person
  days: number
  age?: number
}

interface Props {
  rows: PeopleRow[]
  total: number
  tags: Tag[]
  query: string
  onQuery: (q: string) => void
  tagFilter: string[]
  onToggleTag: (id: string) => void
  sort: SortMode
  onSort: (s: SortMode) => void
  onOpen: (id: string) => void
  onAdd: () => void
  onQuickAdd: () => void
}

export function PeopleView({
  rows,
  total,
  tags,
  query,
  onQuery,
  tagFilter,
  onToggleTag,
  sort,
  onSort,
  onOpen,
  onAdd,
  onQuickAdd,
}: Props) {
  const groups: { label: string; rows: PeopleRow[] }[] = []
  if (sort === 'calendar') {
    for (const r of rows) {
      const label = monthName(r.person.month)
      const last = groups[groups.length - 1]
      if (last?.label === label) last.rows.push(r)
      else groups.push({ label, rows: [r] })
    }
  } else {
    groups.push({ label: '', rows })
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-3xl">People</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">{total} saved</span>
          <button
            type="button"
            onClick={onQuickAdd}
            className="flex items-center gap-1 text-xs text-brand/80 hover:text-brand press-scale"
          >
            <ListPlus size={14} /> Quick add
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          aria-label="Search people"
          className="field pl-9"
          placeholder="Search names or notes"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex rounded-full border border-white/[0.08] p-0.5 shrink-0">
          {(['calendar', 'name'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => onSort(s)}
              className={`text-xs px-3 py-1 rounded-full ${sort === s ? 'bg-white/10 text-white' : 'text-white/45'}`}
            >
              {s === 'calendar' ? 'By month' : 'A–Z'}
            </button>
          ))}
        </div>
        {tags.map((t) => (
          <TagChip key={t.id} tag={t} active={tagFilter.includes(t.id)} onClick={() => onToggleTag(t.id)} />
        ))}
      </div>

      {total === 0 ? (
        <div className="text-center text-white/40 text-sm pt-12 space-y-2">
          <Users size={32} className="mx-auto text-white/20" />
          <p>Nobody here yet. Tap + to add someone.</p>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-white/40 text-sm pt-8">No matches.</p>
      ) : (
        groups.map((g) => (
          <section key={g.label || 'all'}>
            {g.label && <h3 className="section-head">{g.label}</h3>}
            <ul className="space-y-2">
              {g.rows.map((r) => (
                <li key={r.person.id}>
                  <PersonRow
                    person={r.person}
                    tags={tags}
                    days={r.days}
                    age={r.age}
                    onClick={() => onOpen(r.person.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <Fab onClick={onAdd} />
    </div>
  )
}
