// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { Person, Tag } from '../../types'
import { countdownLabel, formatBirthday, isMilestone } from '../../utils/birthday'
import { Avatar } from '../avatar/avatar'

interface Props {
  person: Person
  tags: Tag[]
  days: number
  age?: number
  onClick: () => void
}

export function PersonRow({ person, tags, days, age, onClick }: Props) {
  const personTags = tags.filter((t) => person.tagIds.includes(t.id))
  const milestone = isMilestone(age)
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 glass rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.07] transition-colors press-scale"
    >
      <Avatar name={person.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">{person.name}</span>
          {personTags.map((t) => (
            <span
              key={t.id}
              title={t.name}
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: t.color }}
            />
          ))}
        </div>
        <div className="text-xs text-white/45">
          {formatBirthday({ month: person.month, day: person.day })}
          {age !== undefined && (
            <span className={milestone ? 'text-brand font-semibold' : ''}>
              {' '}
              · turns {age}
              {milestone && ' ★'}
            </span>
          )}
        </div>
      </div>
      <span
        className={`text-xs px-2 py-1 rounded-lg shrink-0 ${
          days === 0
            ? 'bg-brand text-black font-semibold'
            : days <= 7
              ? 'bg-brand/15 text-brand'
              : 'bg-white/[0.05] text-white/50'
        }`}
      >
        {countdownLabel(days)}
      </span>
    </button>
  )
}
