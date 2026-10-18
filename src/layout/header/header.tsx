// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Cake } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-40 glass-nav border-b px-4 py-3 flex items-center gap-2 safe-top">
      <Cake size={22} className="text-brand drop-shadow-[0_0_8px_var(--color-brand)]" />
      <h1 className="font-heading text-2xl tracking-wide text-brand drop-shadow-[0_0_10px_var(--color-brand)]">
        JBIRTHDAYS
      </h1>
    </header>
  )
}
