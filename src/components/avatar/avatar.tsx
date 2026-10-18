// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.

const HUES = [350, 20, 45, 150, 190, 220, 265, 300]

function hueFor(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return HUES[h % HUES.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (first + last).toUpperCase()
}

interface Props {
  name: string
  size?: number
  highlight?: boolean
}

/** Initials bubble with a stable per-name colour. */
export function Avatar({ name, size = 40, highlight }: Props) {
  const hue = hueFor(name)
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 rounded-full flex items-center justify-center font-semibold ${highlight ? 'ring-2 ring-brand animate-glow' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `hsla(${hue}, 80%, 60%, 0.16)`,
        color: `hsl(${hue}, 85%, 72%)`,
      }}
    >
      {initials(name)}
    </div>
  )
}
