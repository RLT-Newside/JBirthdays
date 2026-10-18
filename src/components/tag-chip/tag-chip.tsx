// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { Tag } from '../../types'

interface Props {
  tag: Tag
  active?: boolean
  onClick?: () => void
  small?: boolean
}

export function TagChip({ tag, active, onClick, small }: Props) {
  const cls = `inline-flex items-center gap-1.5 rounded-full border transition-colors whitespace-nowrap ${
    small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
  }`
  const style = {
    borderColor: active ? tag.color : 'rgba(255,255,255,0.08)',
    background: active ? `${tag.color}22` : 'rgba(255,255,255,0.03)',
    color: active ? tag.color : 'rgba(255,255,255,0.6)',
  }
  const dot = <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
  if (!onClick) {
    return (
      <span className={cls} style={style}>
        {dot}
        {tag.name}
      </span>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${cls} press-scale`} style={style}>
      {dot}
      {tag.name}
    </button>
  )
}
