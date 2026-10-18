// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { CalendarHeart, Send, Settings, Users } from 'lucide-react'
import type { Tab } from '../../types'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
  hidden?: boolean
}

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'upcoming', label: 'Upcoming', icon: CalendarHeart },
  { id: 'people', label: 'People', icon: Users },
  { id: 'share', label: 'Share', icon: Send },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function BottomNav({ active, onChange, hidden }: Props) {
  // Hidden while the software keyboard is open so the form gets the space.
  if (hidden) return null

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 glass-nav border-t safe-bottom">
      <div className="flex items-center justify-around">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center py-2.5 px-2 min-w-0 flex-1 transition-all press-scale ${
                isActive ? 'text-brand' : 'text-white/35'
              }`}
            >
              <div className="p-1.5 rounded-xl">
                <Icon size={20} />
              </div>
              <span className="text-[9px] mt-0.5 font-medium">{label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand shadow-[0_0_6px_var(--color-brand)]" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
