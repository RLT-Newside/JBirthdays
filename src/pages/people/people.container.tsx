// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { useMemo, useState } from 'react'
import { useAppData } from '../../context/app-data'
import { daysUntil, turningAge } from '../../utils/birthday'
import { type PeopleRow, PeopleView, type SortMode } from './people.view'

export function PeopleContainer() {
  const { people, tags, setViewingId, setEditingId, setQuickAddOpen } = useAppData()
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [sort, setSort] = useState<SortMode>('calendar')

  const rows = useMemo<PeopleRow[]>(() => {
    const today = new Date()
    const q = query.trim().toLowerCase()
    return people
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.notes?.toLowerCase().includes(q))
      .filter((p) => tagFilter.length === 0 || tagFilter.some((t) => p.tagIds.includes(t)))
      .map((person) => ({ person, days: daysUntil(person, today), age: turningAge(person, today) }))
      .sort((a, b) =>
        sort === 'name'
          ? a.person.name.localeCompare(b.person.name)
          : a.person.month - b.person.month ||
            a.person.day - b.person.day ||
            a.person.name.localeCompare(b.person.name),
      )
  }, [people, query, tagFilter, sort])

  return (
    <PeopleView
      rows={rows}
      total={people.length}
      tags={tags}
      query={query}
      onQuery={setQuery}
      tagFilter={tagFilter}
      onToggleTag={(id) => setTagFilter((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))}
      sort={sort}
      onSort={setSort}
      onOpen={setViewingId}
      onAdd={() => setEditingId('new')}
      onQuickAdd={() => setQuickAddOpen(true)}
    />
  )
}
