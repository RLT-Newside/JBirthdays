// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Plus } from 'lucide-react'

/** Floating "add birthday" button, pinned inside the centred max-w-lg column. */
export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add birthday"
      className="fixed above-nav mb-4 z-30 w-14 h-14 rounded-full bg-brand text-black flex items-center justify-center shadow-[0_0_24px_var(--color-brand)] shadow-brand/40 press-scale"
      style={{ right: 'max(1rem, calc(50vw - 16rem + 1rem))' }}
    >
      <Plus size={26} />
    </button>
  )
}
