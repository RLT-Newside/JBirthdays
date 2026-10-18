// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { BellOff, Cake, Gift, Plus } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '../../components/avatar/avatar'
import { Button } from '../../components/button/button'
import { Fab } from '../../components/fab/fab'
import { PersonRow } from '../../components/person-row/person-row'
import type { Tag } from '../../types'
import { isMilestone, type Upcoming } from '../../utils/birthday'
import { firstName } from '../../utils/templates'

interface Props {
  upcoming: Upcoming[]
  tags: Tag[]
  openIdeas: Map<string, number>
  remindersOff: boolean
  onOpen: (id: string) => void
  onAdd: () => void
  onGoShare: () => void
  onGoSettings: () => void
}

const LATER_PREVIEW = 10
const CONFETTI = ['#fb7185', '#f5e642', '#22d3ee', '#a855f7', '#4ade80']

function TodayHero({ item, ideas, onOpen }: { item: Upcoming; ideas: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative w-full overflow-hidden glass-elevated rounded-2xl p-5 text-left press-scale animate-glow"
    >
      {CONFETTI.map((c, i) => (
        <span
          key={c}
          aria-hidden="true"
          className="absolute bottom-0 w-1.5 h-2.5 rounded-sm animate-confetti"
          style={{ left: `${12 + i * 18}%`, background: c, animationDelay: `${i * 0.3}s` }}
        />
      ))}
      <div className="relative flex items-center gap-4">
        <Avatar name={item.person.name} size={56} highlight />
        <div className="min-w-0">
          <div className="label-caption text-brand/80">Today 🎉</div>
          <div className="font-heading text-3xl leading-tight truncate">{item.person.name}</div>
          <div className="text-sm text-white/60">
            {item.age !== undefined
              ? `Turns ${item.age}${isMilestone(item.age) ? ' — milestone ★' : ''}`
              : 'Birthday today'}
            {ideas > 0 && ` · ${ideas} gift ${ideas === 1 ? 'idea' : 'ideas'}`}
          </div>
        </div>
      </div>
      <div className="relative mt-4 text-center text-sm font-semibold bg-brand text-black rounded-xl py-2">
        Send wishes to {firstName(item.person.name)}
      </div>
    </button>
  )
}

export function UpcomingView({
  upcoming,
  tags,
  openIdeas,
  remindersOff,
  onOpen,
  onAdd,
  onGoShare,
  onGoSettings,
}: Props) {
  const [showAllLater, setShowAllLater] = useState(false)

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center text-center pt-16 px-6 space-y-4">
        <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center animate-glow">
          <Cake size={40} className="text-brand" />
        </div>
        <h2 className="font-heading text-3xl">No birthdays yet</h2>
        <p className="text-sm text-white/50">
          Add the people you never want to forget. You'll get a reminder before each one.
        </p>
        <Button onClick={onAdd} className="flex items-center gap-2">
          <Plus size={16} /> Add first birthday
        </Button>
        <button type="button" onClick={onGoShare} className="text-xs text-white/40 underline underline-offset-4">
          Got a link from a friend? Import it
        </button>
      </div>
    )
  }

  const today = upcoming.filter((u) => u.days === 0)
  const week = upcoming.filter((u) => u.days > 0 && u.days <= 7)
  const month = upcoming.filter((u) => u.days > 7 && u.days <= 31)
  const later = upcoming.filter((u) => u.days > 31)
  const laterShown = showAllLater ? later : later.slice(0, LATER_PREVIEW)

  const row = (u: Upcoming) => (
    <li key={u.person.id}>
      <PersonRow person={u.person} tags={tags} days={u.days} age={u.age} onClick={() => onOpen(u.person.id)} />
    </li>
  )

  return (
    <div className="space-y-6 pb-4">
      {remindersOff && (
        <button
          type="button"
          onClick={onGoSettings}
          className="w-full flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-left text-xs text-amber-200"
        >
          <BellOff size={16} className="shrink-0" />
          Reminders are blocked. Tap to fix in Settings, or you might miss a birthday.
        </button>
      )}

      {today.length > 0 && (
        <section className="space-y-3">
          {today.map((u) => (
            <TodayHero
              key={u.person.id}
              item={u}
              ideas={openIdeas.get(u.person.id) ?? 0}
              onOpen={() => onOpen(u.person.id)}
            />
          ))}
        </section>
      )}

      {week.length > 0 && (
        <section>
          <h2 className="section-head flex items-center gap-1.5">
            This week <Gift size={12} className="text-brand" />
          </h2>
          <ul className="space-y-2">{week.map(row)}</ul>
        </section>
      )}

      {month.length > 0 && (
        <section>
          <h2 className="section-head">Next few weeks</h2>
          <ul className="space-y-2">{month.map(row)}</ul>
        </section>
      )}

      {later.length > 0 && (
        <section>
          <h2 className="section-head">Later</h2>
          <ul className="space-y-2">{laterShown.map(row)}</ul>
          {later.length > LATER_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllLater((v) => !v)}
              className="w-full text-xs text-white/40 py-3"
            >
              {showAllLater ? 'Show less' : `Show all ${later.length}`}
            </button>
          )}
        </section>
      )}

      <Fab onClick={onAdd} />
    </div>
  )
}
